from pytz import timezone
from api.models import CustomUser, ResearcherRequest
from api.models import IncidentReport
from api.models import CmsGuide
from api.supabase_storage import upload_private_photo
from django.utils.timesince import timesince
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email')

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        token['username'] = user.username
        token['email'] = user.email
        token['full_name'] = f"{user.first_name} {user.last_name}"  
        token['role'] = user.role
        
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        update_last_login(None, self.user)
        
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=CustomUser.objects.all())]
    )
    phone = serializers.CharField(required=True)
    username = serializers.CharField(required=False)

    class Meta:
        model = CustomUser
        fields = ('first_name', 'last_name', 'email', 'phone', 'username', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        first_name = validated_data['first_name']
        last_name = validated_data['last_name']
        username = validated_data.get('username') or f"{first_name.capitalize()}.{last_name.capitalize()}"
        password = validated_data['password']

        user = CustomUser.objects.create(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=validated_data['email'],
            phone=validated_data['phone'],
            role="citizen",  # default role
            is_active=True,
            supabase_uid=None
        )

        user.set_password(password)
        user.save()
        return user

        # Profile will be created automatically via post_save
        #user.profile.full_name = f"{first_name} {last_name}"
        #user.profile.save()

class AdminUserListSerializer(serializers.ModelSerializer):
    date_joined_display = serializers.SerializerMethodField()
    last_login_display = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'email',
            'phone',
            'role',
            'extra_roles',
            'is_active',
            'date_joined_display',
            'last_login',
            'last_login_display',
        ]
        
    def get_date_joined_display(self, obj):
        return obj.date_joined.strftime("%b %d, %Y")
    
    def get_last_login_display(self, obj):
        if obj.last_login:
            return f"{timesince(obj.last_login)} ago"
        return "Never"

class AssignUserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('role', 'extra_roles')  # include extra_roles for updates

    def validate_role(self, value):
        valid_roles = ['admin', 'researcher', 'officer', 'citizen']
        if value not in valid_roles:
            raise serializers.ValidationError("Invalid role.")
        return value

    def update(self, instance, validated_data):
        new_role = validated_data.get('role')

        current_role = instance.role
        extra_roles = instance.extra_roles or []

        # Admin/Officer → Researcher
        if current_role in ['admin', 'officer'] and new_role == 'researcher':
            instance.role = None
            if 'Researcher' not in extra_roles:
                extra_roles.append('Researcher')
            instance.extra_roles = extra_roles

        # Researcher → Officer/Admin
        elif current_role is None and 'Researcher' in extra_roles and new_role in ['admin', 'officer']:
            instance.role = new_role
            instance.extra_roles = []

        else:
            instance.role = new_role

        instance.save()
        return instance
    
class IncidentReportCreateSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = IncidentReport
        fields = [
            "category",
            "description",
            "latitude",
            "longitude",
            "accuracy_m",
            "location_display",
            "geocode_raw",
            "photo",
        ]
    
    def create(self, validated_data):
        request = self.context["request"]
        photo = validated_data.pop("photo", None)

        photo_path = None
        if photo:
            photo_path = upload_private_photo(photo)

        report = IncidentReport.objects.create(
            user=request.user,
            photo_path=photo_path,
            **validated_data,
        )
        return report
    
class IncidentReportListSerializer(serializers.ModelSerializer):
    user_label = serializers.SerializerMethodField()

    class Meta:
        model = IncidentReport
        fields = [
            "id",
            "user_label",
            "category",
            "location_display",
            "status",
            "created_at",
        ]
    
    def get_user_label(self, obj):
        return f"Citizen #{obj.user_id}"
    
class ResearcherRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = ResearcherRequest
        fields = ['id', 'user', 'username', 'email', 'status', 'requested_at']
        read_only_fields = ['id', 'user', 'username', 'email', 'requested_at']

class CmsGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = CmsGuide
        fields = "__all__"