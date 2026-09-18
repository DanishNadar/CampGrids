/* The two staff authentication emails.
 *
 * They are separate on purpose and must stay separate. Account activation and
 * password recovery are different events in a person's life with the system: one
 * says "you now have an account", the other says "someone asked to change your
 * password". Sending the recovery message to a brand-new teacher is what this
 * whole module exists to prevent.
 *
 * Supabase fills {{ .ConfirmationURL }} and {{ .Email }} at send time. The two
 * templates are wired to different Supabase actions:
 *
 *   activation -> Invite user     <- admin.inviteUserByEmail()
 *   recovery   -> Reset Password  <- auth.resetPasswordForEmail()
 */

import { brand } from './brand.mjs';
import {
  EmailLayout, EmailHeader, EmailTitle, EmailButton,
  EmailInfoBox, EmailSteps, EmailSecurityNotice, EmailFooter, EmailSpacer
} from './components.mjs';

/* Supabase template variables, left unescaped on purpose: they are placeholders the
 * mail server substitutes, not user input. {{ .Email }} is substituted by Supabase
 * from the auth record, so it is not attacker-controlled markup either. */
const CONFIRMATION_URL = '{{ .ConfirmationURL }}';
const EMAIL = '{{ .Email }}';

/* How long the link lasts. Supabase's mailer_otp_exp governs this; 24 hours is its
 * default for an invitation. Stated in the email so a recipient who opens it late
 * knows to ask for another rather than assuming the system is broken. */
const ACTIVATION_WINDOW = '24 hours';
const RECOVERY_WINDOW = '60 minutes';

/* ------------------------------------------------- A. staff account created ---- */

export const staffAccountCreated = {
  id: 'staff-account-created',
  supabaseTemplate: 'Invite user',
  configKeys: { subject: 'mailer_subjects_invite', content: 'mailer_templates_invite_content' },
  subject: 'Your MSI staff account is ready',
  preheader: 'Set up your password to finish activating your MSI account.',

  html() {
    return EmailLayout({
      title: this.subject,
      preheader: this.preheader,
      body: [
        EmailHeader(),
        EmailTitle({
          eyebrow: 'Account activation',
          heading: 'Your MSI account is ready',
          paragraphs: [
            `An ${brand.organizationShort} staff account has been created for <strong style="color:${brand.color.ink};">${EMAIL}</strong>.`,
            'Use the button below to securely set your password and activate your account. No password was created for you, so this is the last step before you can sign in.'
          ]
        }),
        EmailButton({
          href: CONFIRMATION_URL,
          label: 'Set Up My Account',
          note: `This link can be used once and expires after ${ACTIVATION_WINDOW}.`
        }),
        EmailInfoBox({
          items: [
            { label: 'Account', value: EMAIL },
            { label: 'Access', value: 'Teacher / Staff' }
          ]
        }),
        EmailSteps({
          heading: 'What happens next',
          steps: [
            'Choose a password of at least 12 characters.',
            'Sign in with your work email and that password.',
            'Enter the one-time code we email you, and your workspace opens.'
          ]
        }),
        EmailSecurityNotice({
          heading: 'Weren’t expecting this account?',
          body: 'You can ignore this message and nothing will change &mdash; the account cannot be signed into until a password is set. If you think it was created by mistake, contact an MSI administrator.'
        }),
        EmailFooter({
          reason: `You received this because an ${brand.organizationShort} administrator created a staff account for this address. It is an account message, not a newsletter, so there is nothing to unsubscribe from.`
        }),
        EmailSpacer(0)
      ].join('\n')
    });
  },

  /* Plain-text alternative, for a client set to text-only and for deliverability.
     Never contains anything the HTML does not. */
  text() {
    return [
      `${brand.organizationShort} — ${brand.portal}`,
      '',
      'ACCOUNT ACTIVATION',
      'Your MSI account is ready',
      '',
      `An ${brand.organizationShort} staff account has been created for ${EMAIL}.`,
      'Set your password to activate it:',
      '',
      CONFIRMATION_URL,
      '',
      `This link can be used once and expires after ${ACTIVATION_WINDOW}.`,
      '',
      'What happens next:',
      '  1. Choose a password of at least 12 characters.',
      '  2. Sign in with your work email and that password.',
      '  3. Enter the one-time code we email you.',
      '',
      'Weren’t expecting this account? Ignore this message; the account cannot be',
      'signed into until a password is set. Contact an MSI administrator if it looks',
      'like a mistake.',
      '',
      brand.organization,
      brand.addressLines.join(', '),
      `${brand.organizationShort} staff will never ask you for your password.`
    ].join('\n');
  }
};

/* ------------------------------------------------------- B. password reset ----- */

export const passwordReset = {
  id: 'password-reset',
  supabaseTemplate: 'Reset Password',
  configKeys: { subject: 'mailer_subjects_recovery', content: 'mailer_templates_recovery_content' },
  subject: 'Reset your MSI password',
  preheader: 'Use this secure link to choose a new password for your MSI account.',

  html() {
    return EmailLayout({
      title: this.subject,
      preheader: this.preheader,
      body: [
        EmailHeader(),
        EmailTitle({
          eyebrow: 'Password reset',
          heading: 'Choose a new password',
          paragraphs: [
            `We received a request to reset the password for the ${brand.organizationShort} account <strong style="color:${brand.color.ink};">${EMAIL}</strong>.`,
            'Use the button below to choose a new one. Your current password keeps working until you do.'
          ]
        }),
        EmailButton({
          href: CONFIRMATION_URL,
          label: 'Reset Password',
          note: `This link can be used once and expires after ${RECOVERY_WINDOW}.`
        }),
        EmailInfoBox({
          items: [
            { label: 'Account', value: EMAIL },
            { label: 'Request', value: 'Password reset' }
          ]
        }),
        EmailSecurityNotice({
          heading: 'Didn’t request this?',
          body: 'If you did not request this password reset, you can safely ignore this email and your password will not change. If it keeps happening, contact an MSI administrator.'
        }),
        EmailFooter({
          reason: `You received this because a password reset was requested for this ${brand.organizationShort} account. It is a security message, not a newsletter, so there is nothing to unsubscribe from.`
        }),
        EmailSpacer(0)
      ].join('\n')
    });
  },

  text() {
    return [
      `${brand.organizationShort} — ${brand.portal}`,
      '',
      'PASSWORD RESET',
      'Choose a new password',
      '',
      `We received a request to reset the password for the ${brand.organizationShort} account ${EMAIL}.`,
      '',
      CONFIRMATION_URL,
      '',
      `This link can be used once and expires after ${RECOVERY_WINDOW}.`,
      '',
      'If you did not request this password reset, you can safely ignore this email',
      'and your password will not change.',
      '',
      brand.organization,
      brand.addressLines.join(', '),
      `${brand.organizationShort} staff will never ask you for your password.`
    ].join('\n');
  }
};

/* The Magic Link template is a third, unrelated flow: the numeric staff two-factor
 * code. It is intentionally left alone here so that nothing in this module can put
 * a confirmation link into it. */
export const templates = [staffAccountCreated, passwordReset];
