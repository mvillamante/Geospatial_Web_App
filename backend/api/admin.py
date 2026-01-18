from django.contrib import admin
from api.models import CustomUser, IncidentReport, ResearcherRequest

class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'extra_roles', 'last_login', 'is_active']

admin.site.register(CustomUser, UserAdmin)


class IncidentReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'category', 'description', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['description', 'user__username', 'location_display']

admin.site.register(IncidentReport, IncidentReportAdmin)


class ResearcherRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'requested_at']
    list_filter = ['status', 'requested_at']
    search_fields = ['user__username']

admin.site.register(ResearcherRequest, ResearcherRequestAdmin)