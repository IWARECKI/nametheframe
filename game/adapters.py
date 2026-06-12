"""Custom allauth adapter: Gmail-aware email matching + auto account linking.

Gmail ignores dots and +aliases in the local part, so marcin.iwarecki@gmail.com
and marciniwarecki@gmail.com are the same mailbox. Django/allauth treat them as
different addresses, which creates duplicate accounts on Google login. We
normalize the email and auto-connect a verified social login to the matching
existing account.
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model


def normalize_email(email):
    """Canonical form for comparison. Gmail: lowercase, drop dots & +alias."""
    email = (email or '').strip().lower()
    if '@' not in email:
        return email
    local, _, domain = email.partition('@')
    if domain in ('gmail.com', 'googlemail.com'):
        local = local.split('+', 1)[0].replace('.', '')
        domain = 'gmail.com'
    return f'{local}@{domain}'


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        # Already linked to a user → allauth handles it.
        if sociallogin.is_existing:
            return

        # Only auto-link on a provider-verified email (Google verifies its
        # addresses), to avoid account-takeover via an unverified address.
        verified = [e.email for e in sociallogin.email_addresses if e.verified]
        if not verified:
            return
        target = normalize_email(verified[0])

        User = get_user_model()
        # Small user base → linear scan is fine; normalization isn't a SQL filter.
        for user in User.objects.exclude(email=''):
            if normalize_email(user.email) == target:
                sociallogin.connect(request, user)
                return
