from apps.core.utils.email import send_email
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Sends a test email to the specified address using Resend."

    def add_arguments(self, parser):
        parser.add_argument(
            "email", type=str, help="The email address to send the test email to"
        )

    def handle(self, *args, **options):
        email = options["email"]
        self.stdout.write(f"Sending test email to {email}...")

        try:
            result = send_email(
                to_email=email,
                subject="Test Email from Noteably",
                html_content="<p>This is a test email sent from the Django management command to verify Resend configuration.</p>",
            )

            if result:
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully sent email to {email}")
                )
                self.stdout.write(f"Result: {result}")
            else:
                self.stdout.write(
                    self.style.ERROR("Failed to send email. Check logs for details.")
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error occurred: {str(e)}"))
