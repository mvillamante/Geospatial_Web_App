from django.utils import timezone
from datetime import timedelta
from api.models import *
from api.supabase_storage import upload_private_photo, upload_reply_photo, create_signed_url, upload_cms_photo
from django.utils.timesince import timesince
from django.utils.crypto import get_random_string
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from api.utilities.profanity import contains_profanity

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name"]

class UserSerializer(serializers.ModelSerializer):
    staff_id = serializers.ReadOnlyField()
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'role', 'extra_roles', 'staff_id')

class MeSerializer(serializers.ModelSerializer):
    staff_id = serializers.ReadOnlyField()

    verification_status = serializers.SerializerMethodField()
    verification_rejection_reason = serializers.SerializerMethodField()


    class Meta:
        model = CustomUser
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "extra_roles",
            "staff_id",
            "barangay",
            "is_resident_verified",
            "verification_status",
            "verification_rejection_reason",
        )
        read_only_fields = ("id", 
                            "username", 
                            "role", 
                            "extra_roles", 
                            "staff_id",
                            "barangay",
                            "verification_status",
                            "verification_rejection_reason",
                            )

    def validate_email(self, value):
        value = (value or "").strip()
        if not value:
            return value
        
        qs = CustomUser.objects.filter(email_iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This email is already in use.")
        return value
    
    def validate_phone(self, value):
        value = (value or "").strip()
        if value == "":
            return None
            
        qs = CustomUser.objects.filter(phone=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This phone number is already in use.")
        return value
    
    def get_verification_status(self, obj):
        req = ResidentVerificationRequest.objects.filter(user=obj).order_by("-created_at").first()
        return req.status if req else "unverified"
    
    def get_verification_rejection_reason(self, obj):
        req = ResidentVerificationRequest.objects.filter(user=obj).order_by("-created_at").first()
        if req and req.status == "rejected":
            return req.rejection_reason or ""
        return ""
    
    def get_researcher_status(self, obj):
        req = ResearcherRequest.objects.filter(user=obj).order_by("-created_at").first()
        return req.status if req else "none"

    def get_researcher_rejection_reason(self, obj):
        req = ResearcherRequest.objects.filter(user=obj).order_by("-created_at").first()
        if req and req.status == "rejected":
            return req.rejection_reason or ""
        return ""

    def get_researcher_rejection_reason(self, obj):
        req = ResearcherRequest.objects.filter(user=obj).order_by("-created_at").first()
        if req and req.status == "rejected":
            return req.rejection_reason or ""
        return ""

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
        )

        user.set_password(password)
        user.add_group("Citizen")
        user.save()
        return user


class AdminUserListSerializer(serializers.ModelSerializer):
    staff_id = serializers.ReadOnlyField()
    date_joined_display = serializers.SerializerMethodField()
    last_login_display = serializers.SerializerMethodField()
    department = serializers.CharField(source="department.name", read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'staff_id',
            'username',
            'first_name',
            'last_name',
            'email',
            'phone',
            'role',
            'extra_roles',
            'department',
            'is_active',
            'status',
            'date_joined_display',
            'last_login',
            'last_login_display',
        ]

    def get_status(self, obj):
        if not obj.is_active:
            return "Inactive"

        if obj.last_login:
            # if last login was more than 90 days ago
            if obj.last_login < timezone.now() - timedelta(days=90):
                return "Inactive"

        return "Active"
        
    def get_date_joined_display(self, obj):
        return obj.date_joined.strftime("%b %d, %Y")
    
    def get_last_login_display(self, obj):
        if obj.last_login:
            return f"{timesince(obj.last_login)} ago"
        return "Never"
    
    def get_department(self, obj):
        return getattr(obj, "department", "N/A") 
    
    def create(self, validated_data):
        description = validated_data.get("description", "")

        if contains_profanity(description):
            validated_data["is_flagged"] = True

        return super().create(validated_data)


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
        new_role = validated_data.get('role', '').lower()
        current_role = (instance.role or '').lower()
        extra_roles = [r.lower() for r in (instance.extra_roles or [])]

        print("Current Role:", instance.role)
        print("New Role:", new_role)
        print("Extra Roles:", instance.extra_roles)

        # Admin/Officer → Researcher
        if current_role in ['admin', 'officer'] and new_role == 'researcher':
            instance.role = None
            if 'Researcher' not in extra_roles:
                extra_roles.append('Researcher')
            instance.extra_roles = extra_roles

        # Researcher → Officer/Admin
        elif 'researcher' in extra_roles and new_role in ['admin', 'officer']:
            instance.role = new_role
            instance.extra_roles = []

        else:
            instance.role = new_role
            instance.extra_roles = extra_roles if 'researcher' in extra_roles else []

        instance.save()
        
        # ----- SYNC GROUPS -----
        instance.groups.clear()

        # Add primary role
        if instance.role:
            instance.add_group(instance.role.capitalize())

        # Add extra roles
        for r in instance.extra_roles or []:
            instance.add_group(r.capitalize()) 
        
        return instance
    
class PasswordResetRequestSerializer(serializers.Serializer):
    email_or_phone = serializers.CharField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    email_or_phone = serializers.CharField()
    otp = serializers.CharField(min_length=4, max_length=4)
    new_password = serializers.CharField(min_length=8)
    
class IncidentReportCreateSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = IncidentReport
        fields = [
            "category",
            "other_category",
            "description",
            "latitude",
            "longitude",
            "location_display",
            "suggested_critical_level",
            "photo",
        ]

    def validate(self, attrs):
        if attrs.get("category") == "others" and not (attrs.get("other_category") or "").strip():
            raise serializers.ValidationError({"other_category": "Please specify the category."})
        return attrs
    
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
    verified_critical_level  = serializers.CharField(allow_null=True)
    photo_url = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    assigned_officer_label = serializers.SerializerMethodField()
    lgu_post = serializers.SerializerMethodField()
    assigned_officer_id = serializers.IntegerField(allow_null=True, read_only=True)
    lat = serializers.DecimalField(
        source="latitude",
        max_digits=10,
        decimal_places=7,
        allow_null=True
    )

    lng = serializers.DecimalField(
        source="longitude",
        max_digits=10,
        decimal_places=7,
        allow_null=True
    )
    reply_image_url = serializers.SerializerMethodField()

    class Meta:
        model = IncidentReport
        fields = [
            "id",
            "user_label",
            "category",
            "other_category",
            "category_display",
            "description",
            "location_display",
            "lat",
            "lng",
            "status",
            "created_at",
            "suggested_critical_level",
            "verified_critical_level",
            "photo_url",
            "assigned_officer_label",
            "officer_note",
            "needs_info_note",
            "lgu_post",
            "reply_message",
            "reply_image_url",
            "rejection_reason",
            "assigned_officer_id",
        ]
        
    def get_reply_image_url(self, obj):
        if not obj.reply_image_url:
            return None
        
        return create_signed_url(obj.reply_image_url, expires_in_seconds=3600)
        
    def get_category_display(self, obj):
        if obj.category == "others" and obj.other_category:
            return obj.other_category.strip()
        return obj.get_category_display()

    def get_lgu_post(self, obj):
        if (obj.status or "").lower() != "resolved":
            return None

        if not obj.lgu_post:
            return None

        return {
            "incident": obj.get_category_display(),
            "status": obj.status,
            "what_happened": obj.lgu_post.get("what_happened"),
            "action_taken": obj.lgu_post.get("action_taken"),
            "advisory": obj.lgu_post.get("advisory"),
            "updated_at": obj.lgu_post.get("published_at"),
    }




    def get_user_label(self, obj):
        return f"Citizen #0{obj.user_id}"

    def get_assigned_officer_label(self, obj):
        if not obj.assigned_officer:
            return None
        fn = (obj.assigned_officer.first_name or "").strip()
        ln = (obj.assigned_officer.last_name or "").strip()
        full = f"{fn} {ln}".strip()
        return full if full else (obj.assigned_officer.username or "Officer")

    def get_photo_url(self, obj):
        if not obj.photo_path:
            return None
        return create_signed_url(obj.photo_path, expires_in_seconds=3600)

class AssignOfficerSerializer(serializers.Serializer):
    officer_id = serializers.IntegerField()

    def update(self, instance, validated_data):
        officer_id = validated_data.get("officer_id")
        officer = CustomUser.objects.filter(id=officer_id, role="officer").first()
        if not officer:
            raise serializers.ValidationError("Officer not found.")
        instance.assigned_officer = officer
        instance.save()
        return instance


class UpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=IncidentReport.STATUS_CHOICES)

class OfficerOptionSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ["id", "label"]

    def get_label(self, obj):
        full = obj.get_full_name().strip()
        if full:
            return full
        if obj.username:
            return obj.username
        return f"Officer #{obj.id}"


class IncidentReportQueueSerializer(serializers.ModelSerializer):
    reporterName = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    location = serializers.CharField(source="location_display")
    barangay = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    lastUpdatedAt = serializers.DateTimeField(source="last_updated_at", read_only=True)
    citizenRisk = serializers.CharField(source="suggested_critical_level")
    createdAt = serializers.DateTimeField(source="created_at")
    lat = serializers.DecimalField(source="latitude", max_digits=10, decimal_places=7, allow_null=True)
    lng = serializers.DecimalField(source="longitude", max_digits=10, decimal_places=7, allow_null=True)
    assignedOfficerId = serializers.IntegerField(source="assigned_officer_id", allow_null=True)
    verifiedRisk = serializers.CharField(source="verified_critical_level", required=False, allow_null=True)
    assignedTo = serializers.SerializerMethodField()
    lgu_post = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    reply_message = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reply_image_url = serializers.SerializerMethodField()
    needs_info_note = serializers.CharField(required=False, allow_blank=True, allow_null=True )
    rejection_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True )


    class Meta:
        model = IncidentReport
        fields = [
            "id",
            "title",        
            "citizenRisk",
            "category",
            "verifiedRisk",
            "location",    
            "barangay",     
            "createdAt",
            "reporterName",
            "assignedTo",
            "assignedOfficerId",
            "lastUpdatedAt",
            "description",
            "reply_message",
            "reply_image_url",
            "needs_info_note",
            "rejection_reason",
            "lat",
            "lng",
            "status",
            "photo_url",
            "lgu_post",
        ]
        
    def update(self, instance, validated_data):
       
       instance = super().update(instance, validated_data)
       return instance
    
    def get_photo_url(self, obj):
        if not obj.photo_path:
            return None
        return create_signed_url(obj.photo_path, expires_in_seconds=3600)

    def get_lgu_post(self, obj):
        if (obj.status or "").lower() != "resolved":
            return None
        return obj.lgu_post

    def get_assignedTo(self, obj):
        u = obj.assigned_officer
        if not u:
            return None
        return (u.get_full_name().strip() or u.username)
    
    def get_status(self, obj):
        s = (obj.status or "").lower()
        if s == "pending":
            return "pending"
        if s == "in_progress":
            return "in_progress"
        if s == "needs_info":
            return "needs_info"
        if s == "resolved":
            return "resolved"
        if s == "rejected":
            return "rejected"
        return "pending"

    def get_reporterName(self, obj):
        u = obj.user
        return(u.get_full_name().strip() or u.username or "Anonymous")

    def get_title(self, obj):
        if obj.category == "others" and obj.other_category:
            return obj.other_category
        return obj.get_category_display()
    
    def get_category(self, obj):
        if obj.category == "others" and obj.other_category:
            return "Others"
        return obj.get_category_display()

    def get_barangay(self, obj):
        return obj.location_display
    
    def get_reply_image_url(self, obj):
        if not obj.reply_image_url:
            return None
        
        return create_signed_url(obj.reply_image_url, expires_in_seconds=3600)
    
    
class IncidentReportUpdateSerializer(serializers.ModelSerializer):
    verifiedRisk = serializers.CharField(source="verified_critical_level", required=False, allow_null=True)
    assigned_officer = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.filter(role="officer"),write_only=True,required=False)
    assignedTo = serializers.SerializerMethodField()
    officerNote = serializers.CharField(source="officer_note", required=False, allow_blank=True, allow_null=True)
    rejectionReason = serializers.CharField(source="rejection_reason", required=False, allow_blank=True, allow_null=True)
    lastUpdatedAt = serializers.DateTimeField(source="last_updated_at", read_only=True)
    reply_message = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reply_image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    needs_info_note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    lgu_post = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = IncidentReport
        fields = [
            "status",
            "verifiedRisk",
            "assigned_officer",
            "officerNote",
            "rejectionReason",
            "assignedTo",
            "lastUpdatedAt",
            "needs_info_note",
            "description",
            "reply_message",
            "reply_image_url",
            "lgu_post",
        ]

    def get_assignedTo(self, obj):
        u = obj.assigned_officer
        if not u:
            return None
        return (u.get_full_name().strip() or u.username or f"Citizen #{u.id}")

    def update(self, instance, validated_data):
        officer = validated_data.pop("assigned_officer", None)
        if officer:
            instance.assigned_officer = officer

        return super().update(instance, validated_data)

class IncidentReportReplySerializer(serializers.ModelSerializer):
    reply_message = serializers.CharField(required=False, allow_blank=True)
    reply_image = serializers.ImageField(write_only=True, required=False) 
    reply_image_url = serializers.CharField(read_only=True)
    
    class Meta:
        model = IncidentReport
        fields = ["reply_message", "reply_image_url", "reply_image"]

    def validate(self, attrs):
        instance = self.instance
        # Only allow sending reply if report is in 'needs_info' status
        if instance.status != "needs_info":
            raise serializers.ValidationError(
                "Cannot send reply unless report status is 'needs_info'."
            )
            
        # Prevent sending multiple replies if already exists
        if instance.reply_message or instance.reply_image_url:
            raise serializers.ValidationError("Reply has already been sent.")
        if not attrs.get("reply_message") and not attrs.get("reply_image"):
            raise serializers.ValidationError("Reply cannot be empty.")
        return attrs
    
    def update(self, instance, validated_data):
        reply_message = validated_data.get("reply_message")
        reply_image = validated_data.get("reply_image")

        if reply_message:
            instance.reply_message = reply_message

        if reply_image:
            path = upload_reply_photo(
                reply_image,
                report_id=str(instance.id),
            )
            instance.reply_image_url = path


        instance.last_updated_at = timezone.now()
        instance.save()
        return instance

class PublicLandingPageSerializer(serializers.Serializer):
    activeHazards = serializers.IntegerField()
    criticalAlerts = serializers.IntegerField()
    reportsToday = serializers.IntegerField()
    avgResponseTimeMinutes = serializers.FloatField()
    
class ResearcherRequestSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    class Meta:
        model = ResearcherRequest
        fields = [
            'id', 'first_name', 'last_name', 'email', 'orgSchool', 'purpose', 'attachment',
            'status', 'rejection_reason', 'reviewed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'rejection_reason', 'reviewed_at', 'created_at', 'updated_at']

class ResidentVerificationRequestSerializer(serializers.ModelSerializer):
    citizen_id = serializers.IntegerField(source='user.id', read_only=True)
    citizen_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ResidentVerificationRequest
        fields = [
            "id",
            "citizen_id",
            "citizen_name",
            "barangay",
            "address",
            "id_image",
            "status",
            "rejection_reason",
            "created_at",
            "reviewed_at"
        ]
        read_only_fields = ["id", "citizen_id", "citizen_name", "created_at", "reviewed_at"]

    def get_citizen_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

class CmsGuideAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CmsGuideAttachment
        fields = ["id", "guide", "file_url", "file_type", "created_at"]


class CmsGuideSerializer(serializers.ModelSerializer):
    attachments = CmsGuideAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = CmsGuide
        fields = "__all__"


class CmsGuideAttachmentCreateSerializer(serializers.Serializer):
    image = serializers.ImageField(write_only=True)

    def create(self, validated_data):
        guide = self.context["guide"]
        image = validated_data["image"]

        public_url = upload_cms_photo(image)

        return CmsGuideAttachment.objects.create(
            guide=guide,
            file_url=public_url,
            file_type="image",
        )
             
class CreateStaffUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    staff_id = serializers.CharField(read_only=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "phone",
            "role",
            "extra_roles",
            "department",
            "password",
            "staff_id",
        ]

    def validate_role(self, value):
        allowed = ["admin", "officer", "researcher"]
        value_lower = value.lower()
        if value_lower not in allowed:
            raise serializers.ValidationError("Citizen cannot be created here.")
        return value_lower

    def create(self, validated_data):
        phone = validated_data.pop("phone", "---")
        role = validated_data.pop("role")
        password = validated_data.pop("password")
        
        print("this is validated data", validated_data)

        user = CustomUser(
            **validated_data,
            phone=phone,
            is_staff=True,
            is_active=True,
        )
        user.set_password(password)
        
        user.save()

        # Role logic
        if role == "researcher":
            user.role = ""
            user.extra_roles = ["Researcher"]
            user.add_group("Researcher")
        else:
            user.role = role
            user.extra_roles = []
            user.add_group(role.capitalize())
            
        user.save()

        return user

class EvacuationCenterSerializer(serializers.ModelSerializer):
    coordinates = serializers.SerializerMethodField()

    class Meta:
        model = EvacuationCenter
        fields = [
            "id",
            "name",
            "type",
            "latitude",
            "longitude",
            "coordinates",
            "capacity",
            "address",
            "contact",
            "barangay",
            "facilities",
        ]

    def get_coordinates(self, obj):
        return [float(obj.latitude), float(obj.longitude)]

class QuickContactPhoneSerializer(serializers.ModelSerializer):
    label = serializers.CharField(allow_blank=True)  
    number = serializers.CharField(allow_blank=True)
    class Meta:
        model = QuickContactPhone
        fields = ["type", "label", "number"]

class QuickContactSerializer(serializers.ModelSerializer):
    phones = QuickContactPhoneSerializer(many=True)

    class Meta:
        model = QuickContact
        fields = [
            "id",
            "name",
            "description",
            "email",
            "facebook_url",
            "website_url",
            "office_hours",
            "address",
            "map_url",
            "phones",
        ]

    def update(self, instance, validated_data):
        phones_data = validated_data.pop('phones', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if phones_data is not None:
            instance.phones.all().delete()

            for phone in phones_data:
                QuickContactPhone.objects.create(contact=instance, **phone)

        return instance

class NotificationSerializer(serializers.ModelSerializer):
    is_unread = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", 
            "type",
            "title", 
            "category", 
            "body", 
            "created_at", 

            # CMS
            "cms_guide_id", 
            "cms_post_id", 

            # Incident fields
            "event", 
            "incident_id", 
            "category", 
            "barangay", 
            "severity", 
            "severity_from", 
            "severity_to",

            # Report status fields
            "report_id",
            "report_category",
            "report_barangay",
            "status_from",
            "status_to",
            "officer_message",
            "resolution_summary",
            "rejection_reason",

            "is_unread"]

    def get_is_unread(self, obj):
        user = self.context["request"].user
        rel = NotificationRead.objects.filter(user=user, notification=obj).first()
        return not (rel and rel.is_read)