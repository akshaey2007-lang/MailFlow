from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'avatar',
            'theme_preference',
            'emails_per_page',
            'default_signature',
            'created_at',
        ]
        read_only_fields = ['id', 'email', 'created_at']


class UserSettingsSerializer(serializers.ModelSerializer):
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    imap_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_smtp_password = serializers.SerializerMethodField()
    has_imap_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'full_name',
            'theme_preference',
            'emails_per_page',
            'default_signature',
            'smtp_host',
            'smtp_port',
            'smtp_username',
            'smtp_password',
            'has_smtp_password',
            'smtp_use_tls',
            'imap_host',
            'imap_port',
            'imap_username',
            'imap_password',
            'has_imap_password',
            'imap_use_ssl',
        ]

    def get_has_smtp_password(self, obj):
        return bool(obj.smtp_password)

    def get_has_imap_password(self, obj):
        return bool(obj.imap_password)

    def update(self, instance, validated_data):
        smtp_pw = validated_data.pop('smtp_password', None)
        imap_pw = validated_data.pop('imap_password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if smtp_pw is not None and smtp_pw.strip():
            instance.smtp_password = smtp_pw
        if imap_pw is not None and imap_pw.strip():
            instance.imap_password = imap_pw

        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'confirm_password']

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            full_name=validated_data.get('full_name', ''),
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        data = super().validate(attrs)
        user_data = UserSerializer(self.user).data
        data['user'] = user_data
        return data
