from django.contrib import admin
from api.models import CustomUser

class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email']

admin.site.register(CustomUser, UserAdmin)