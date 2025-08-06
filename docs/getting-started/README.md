# Getting Started with Eternally Yours RSVP Platform

**For**: All Users  
**Difficulty**: Beginner  
**Time**: 5 minutes

---

## 🌟 Welcome to Your Wedding RSVP Platform!

This platform makes managing wedding RSVPs simple and stress-free. Whether you're a guest responding to an invitation or an organizer managing an event, we've got you covered.

---

## 👥 What Can You Do Here?

### 🎉 **For Wedding Guests**
- **Respond to invitations** quickly and easily
- **Add plus-ones** and children's details
- **Update your response** if plans change
- **View event details** and important information

### 👰🤵 **For Event Organizers**
- **Manage guest lists** and track responses
- **Send invitations** via email, SMS, or WhatsApp  
- **Coordinate accommodations** and travel
- **Generate reports** and analytics
- **Customize your event** settings

---

## 🚀 First Steps

### Step 1: Access the Platform
1. **Open your web browser** (Chrome, Safari, Firefox, or Edge)
2. **Go to your event's URL** (provided in your invitation)
3. **The platform works on all devices** - phone, tablet, or computer

### Step 2: Understand Your Role
When you access the platform, you'll see different options based on your role:

**🟢 Guest Access**
- Simple RSVP form
- Event information
- Contact details

**🟡 Admin Access** 
- Dashboard with event overview
- Guest management tools
- Communication features

**🔴 Super Admin Access**
- First-time platform setup with enterprise-grade authentication
- Multi-provider authentication configuration (Database + Supabase)
- UI-based authentication method switching
- Full platform configuration  
- User management
- Advanced security settings

### Step 3: Navigation Basics
The platform uses a clean, simple design:

- **🏠 Home/Dashboard**: Your main starting point
- **📊 Menu**: Access all features from the menu
- **❓ Help**: Click the help icon for assistance
- **👤 Profile**: Manage your account settings

---

## 📱 Mobile-Friendly Design

The platform works perfectly on your phone:
- **Responsive design** adapts to your screen
- **Touch-friendly** buttons and forms
- **Fast loading** on mobile networks
- **Offline capability** for basic functions

---

## 🔐 Privacy & Security

Your information is protected with enterprise-grade security:
- **Secure connections** (HTTPS encryption)
- **Enterprise authentication** with one-time setup passwords
- **No hardcoded credentials** - all passwords dynamically generated
- **Role-based access** - you only see what you need
- **Data privacy** compliant with regulations
- **Audit logging** tracks all security events
- **No spam** - communications only for your events

### First-Time Platform Setup
When accessing a new installation:

#### **Enterprise Authentication Setup**
- **Automatic detection**: Server detects first-time setup and enters bootstrap mode
- **Secure OTP generation**: One-time admin password using crypto.randomBytes(16)
- **Console credentials**: Admin credentials displayed securely in server console
- **Forced password change**: Enterprise password policy enforced on first login
- **Zero hardcoded passwords**: All credentials dynamically generated

#### **Multi-Provider Authentication**
- **Database Auth (Default)**: Enterprise-grade JWT authentication with bcrypt hashing
- **Supabase Auth (Optional)**: Advanced features like magic links and OAuth
- **UI-based switching**: Change authentication methods through admin interface
- **Automatic fallback**: Graceful fallback to Database Auth if external services fail

---

## 🆘 Getting Help

If you need assistance:

1. **Help Icon**: Click the ? icon in the top menu
2. **Tooltips**: Hover over buttons for quick explanations  
3. **Error Messages**: Clear guidance when something goes wrong
4. **Contact Support**: Available through the help section

---

## ✅ What's Next?

Choose your path based on your role:

### 🎉 **I'm a Wedding Guest**
➡️ [**RSVP Process Guide**](../user-guides/rsvp-process.md)

### 👰🤵 **I'm Planning a Wedding** 
➡️ [**Event Setup Guide**](../admin-guides/event-setup.md)

### 🔧 **I'm a Platform Administrator**
➡️ [**Platform Setup Guide**](../super-admin-guides/platform-setup.md)

---

## 💡 Pro Tips

- **Bookmark the platform** for quick access
- **Enable notifications** to stay updated
- **Use your phone** - it's fully mobile-optimized
- **Ask for help** - the support team is friendly and responsive

---

*Ready to get started? Choose your path above and let's make your wedding planning smooth and enjoyable!*