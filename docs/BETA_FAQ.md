---
title: "GLX Beta FAQ"
description: "Frequently Asked Questions for GLX Civic Network beta testers"
lastUpdated: "2025-12-06"
nextReview: "2026-01-06"
contentType: "documentation"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: ["beta", "faq", "support"]
relatedDocs: ["BETA_TESTING_GUIDE.md", "BETA_LAUNCH_ROADMAP.md"]
---

# GLX Beta FAQ

Frequently asked questions for GLX Civic Network beta testers.

---

## Account & Registration

### How do I create a beta account?

1. Visit [glxcivicnetwork.me](https://glxcivicnetwork.me)
2. Click "Register" and fill in your details
3. Verify your email address
4. (Optional) Complete phone verification and 2FA setup

### I didn't receive my verification email. What should I do?

1. Check your spam/junk folder
2. Wait 5 minutes - email delivery can sometimes be delayed
3. Click "Resend Verification Email" on the verification page
4. If still not received, contact beta@glxcivicnetwork.me

### Can I change my username?

Yes! Go to your Profile page and click "Edit Profile" to change your username. Note that usernames must be unique and 3-30 characters.

### How do I set up Two-Factor Authentication (2FA)?

1. Go to Profile → Security Settings
2. Click "Enable 2FA"
3. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
4. Enter the verification code to confirm

### Can I use the same account on multiple devices?

Yes, you can log in from any device. We recommend enabling 2FA for additional security.

---

## Features & Functionality

### What features are available in beta?

**Available Now:**
- User registration and authentication
- Email and phone verification
- Two-factor authentication
- Help request creation and matching
- Skill-based matching system
- Real-time messaging
- Community governance (proposals and voting)
- CROWDS stablecoin dashboard (view only)
- Privacy settings

**Coming in Phase 2:**
- Full CROWDS stablecoin transactions
- Pi Network wallet integration
- Advanced skill matching algorithms
- Mobile applications

### How does skill matching work?

Our skill matching system:
1. Analyzes skills listed in your profile
2. Compares them with skills needed for help requests
3. Calculates a match score based on:
   - Exact skill matches (highest weight)
   - Related skills in the same category
   - Fuzzy matching for similar skill names
4. Shows you requests that best match your skills

### What skill categories are available?

- **Technical**: Programming, web development, IT support
- **Healthcare**: First aid, nursing, mental health support
- **Education**: Tutoring, teaching, mentoring
- **Trades**: Plumbing, electrical, carpentry
- **Community**: Event planning, organizing, advocacy
- **Emergency**: Crisis response, search & rescue
- **Creative**: Design, photography, content creation
- **Legal**: Legal advice, document assistance
- **Transportation**: Driving, delivery assistance
- **General**: Cooking, cleaning, gardening

### Can I create a help request without specifying skills?

Yes, skills are optional. However, specifying skills helps match you with helpers who have the expertise you need.

### How do I offer help to someone?

1. Browse the help requests list
2. Click on a request you want to help with
3. Click "Offer Help"
4. A chat room will be created for you and the requester

### What urgency levels are available for help requests?

- **Low**: Not time-sensitive, can wait days/weeks
- **Medium**: Needs attention within days
- **High**: Needs attention within hours
- **Critical**: Immediate attention needed

---

## CROWDS Stablecoin

### What is CROWDS?

CROWDS is GLX's stablecoin designed for community-based transactions and governance. During beta, the dashboard is in view-only mode.

### Can I buy or transfer CROWDS during beta?

No, during the beta phase the CROWDS system is in demonstration mode. Full transaction capabilities will be available in Phase 2.

### What will CROWDS be used for?

- Community tipping and rewards
- Governance voting weight
- Platform transaction fees
- Community lending (Phase 3)
- Service payments between users

---

## Privacy & Security

### Is my data secure?

Yes! We implement:
- AES-256-GCM encryption for sensitive data
- Secure password hashing with bcrypt
- HTTPS/TLS for all connections
- Rate limiting to prevent abuse
- Post-quantum cryptography foundations
- Comprehensive input validation

### What data do you collect?

- Account information (email, username, optional phone)
- Profile data (skills, avatar)
- Help request content
- Messages (encrypted at rest)
- Usage analytics (anonymized)

### Can I control who sees my information?

Yes! Go to Profile → Privacy Settings to control:
- Email visibility
- Phone visibility
- Wallet address visibility

### How do I delete my account?

Contact beta@glxcivicnetwork.me with your account deletion request. We'll process it within 48 hours.

---

## Technical Issues

### The app is slow. What can I do?

1. Clear your browser cache
2. Try a different browser
3. Check your internet connection
4. Disable browser extensions temporarily
5. Report persistent issues to us

### I'm seeing error messages. What should I do?

1. Note the error message
2. Try refreshing the page
3. Log out and log back in
4. Clear cookies for the site
5. Report with screenshots if it persists

### Why won't my image upload?

Check that your image:
- Is under 10MB
- Is a supported format (JPEG, PNG, GIF)
- Isn't corrupted

### The real-time chat isn't working. Help!

1. Check your internet connection
2. Refresh the page
3. Try a different browser
4. Ensure WebSocket connections aren't blocked by firewall

### How do I report a bug?

Use our bug report template:

```markdown
**Summary:** [Brief description]
**Browser/Device:** [e.g., Chrome 120, Windows]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
**Expected:** [What should happen]
**Actual:** [What happened]
**Screenshots:** [If available]
```

Submit via:
- In-app feedback
- Discord #beta-feedback
- Email: beta@glxcivicnetwork.me

---

## Beta Program

### How long is the beta period?

Phase 1 beta is 4 weeks. Extensions may occur based on feedback and feature completion.

### Will my beta data transfer to production?

Yes, your account and core data will carry over to the full release.

### How can I become a top contributor?

- Report bugs with detailed information
- Provide thoughtful feature feedback
- Test edge cases and unusual scenarios
- Help other beta testers
- Complete weekly feedback surveys
- Participate in beta tester calls

### What rewards do top contributors get?

- 🏆 Early access to new features
- 🎖️ Beta Tester badge on profile
- 🌟 Recognition in release notes
- 💎 CROWDS token rewards (when available)

---

## Community & Support

### Where can I get help?

- **Discord**: Join our beta community
- **Email**: beta@glxcivicnetwork.me
- **Documentation**: This guide and related docs

### How do I connect with other testers?

Join our Discord server (link provided to beta testers) to:
- Share feedback and experiences
- Get help from other testers
- Participate in discussions
- Stay updated on beta progress

### Can I invite friends to the beta?

Please check with the beta team before sharing access. Beta invitations are currently limited.

---

## Miscellaneous

### Is there a mobile app?

Not yet. The web app is mobile-responsive and works well on phones and tablets. Native mobile apps are planned for Phase 2.

### What browsers are supported?

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

### Can I use GLX offline?

Limited offline functionality is planned. Currently, you need an internet connection.

### How do I log out?

Click your profile avatar in the top-right corner and select "Log Out".

### Where can I see release notes?

Check the [CHANGELOG.md](https://github.com/rsl37/GLX_Civic_Networking_App/blob/main/CHANGELOG.md) on GitHub.

---

## Still Have Questions?

Can't find your answer? Contact us:

- **Email**: beta@glxcivicnetwork.me
- **Discord**: #beta-support channel
- **GitHub**: [Open an issue](https://github.com/rsl37/GLX_Civic_Networking_App/issues)

---

*Last Updated: December 2025*
*GLX: Connect the World* 🌟
