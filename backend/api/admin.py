from django.contrib import admin
from api.models import CustomUser, IncidentReport, ResearcherRequest, CmsGuide, EvacuationCenter, CmsGuideAttachment, QuickContactPhone, QuickContact

class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'staff_id', 'email', 'role', 'extra_roles', 'last_login', 'is_active']
    list_filter = ['role', 'is_active', 'last_login']
    search_fields = ['username', 'email', 'role']
    readonly_fields = ('staff_id',)

admin.site.register(CustomUser, UserAdmin)


class IncidentReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'category', 'description', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['description', 'user__username', 'location_display']

admin.site.register(IncidentReport, IncidentReportAdmin)


class ResearcherRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'created_at', 'rejection_reason']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'rejection_reason']

admin.site.register(ResearcherRequest, ResearcherRequestAdmin)

class CmsGuideAttachmentInline(admin.TabularInline):
    model = CmsGuideAttachment
    extra = 1

class CmsGuideAdmin(admin.ModelAdmin):
    inlines = [CmsGuideAttachmentInline]
    list_display = (
        "post_id",
        "post_title",
        "staff_id",
        "post_type",
        "status",
        "is_pinned",
        "created_at",
        "published_at",
    )

    list_filter = ("status","post_type","is_pinned",)
    search_fields = ("post_title","post_body",)
    ordering = ("-created_at",)

class CmsGuideAttachmentAdmin(admin.ModelAdmin):
    list_display = (
        "guide",
        "file_type",
        "created_at",
    )
admin.site.register(CmsGuide, CmsGuideAdmin)
admin.site.register(CmsGuideAttachment, CmsGuideAttachmentAdmin)

class EvacuationCenterAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'capacity', 'latitude', 'longitude']
    list_filter = ['type', 'capacity']
    search_fields = ['name', 'address', 'facilities']
    ordering = ['name']

admin.site.register(EvacuationCenter, EvacuationCenterAdmin)

class QuickContactPhoneInline(admin.TabularInline):
    model = QuickContactPhone
    extra = 1
    fields = ('type', 'label', 'number', 'priority')
    ordering = ('priority',)

class QuickContactAdmin(admin.ModelAdmin):
    inlines = [QuickContactPhoneInline]
    list_display = ('name', 'description', 'email', 'facebook_url', 'website_url', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description', 'email')

admin.site.register(QuickContact, QuickContactAdmin)