# 🍲 Community Food Wastage Reduction Portal

## 📌 Project Overview

The **Community Food Wastage Reduction Portal** is a web-based application designed to reduce food waste by connecting food donors with NGOs, shelters, and communities in need. Donors can share surplus food, while recipients can search for and claim available donations.

The main goal is to minimize food wastage, improve food distribution, and promote community support through technology.

## 🎯 Objectives

- Reduce food wastage by encouraging surplus food donations.
- Connect restaurants, hotels, households, and event organizers with NGOs and shelters.
- Provide an easy way to list, search, and claim food donations.
- Help recipients find available food donations in nearby areas.
- Improve transparency through donation status tracking and feedback.
- Promote social responsibility and community collaboration.

## ✨ Features

### 👤 User Management
- User registration and login.
- Role-based access for donors and recipients.
- Logout functionality.

### 🍱 Donor Module
- Add new food donation listings.
- Update and delete donation information.
- Provide food details, category, quantity, expiry date, and pickup address.
- View donation history and track donation status.

### 🤝 Recipient Module
- Search for available food donations.
- View food details and pickup information.
- Claim available donations.
- Track donation status.
- Confirm successful delivery.
- Provide feedback and ratings.

### 🛠️ Admin Module
- Manage registered users.
- Monitor donation listings and records.
- Support platform administration and transparency.

### 📍 Additional Features
- Location-based food donation search.
- Donation status tracking.
- Vegetarian and non-vegetarian food categories.
- Food image uploads.
- Notifications for nearby donations, where implemented.

## 🧰 Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Structure of web pages |
| CSS3 | Styling and layout |
| Bootstrap | Responsive user interface |
| JavaScript | Client-side functionality |
| React | Frontend components, if used in the implementation |
| PHP | Backend development and server-side processing |
| MySQL | Database management |
| XAMPP | Local development server |
| Git and GitHub | Version control and project hosting |

## ⚙️ Installation and Setup

### Prerequisites

Install the following software:

- [XAMPP](https://www.apachefriends.org/)
- [Git](https://git-scm.com/)
- A modern web browser

### Step 1: Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/aizaashadkhan/Community-Food-Wastage-Reduction-Portal-.git
```

If you have already cloned the repository, do not clone it again into the existing project folder.

### Step 2: Move the Project to XAMPP

Place the project folder inside the XAMPP `htdocs` directory.

Default Windows location:

```text
C:\xampp\htdocs\
```

### Step 3: Start XAMPP

1. Open the XAMPP Control Panel.
2. Start **Apache**.
3. Start **MySQL**.

### Step 4: Configure the Database

1. Open [phpMyAdmin](http://localhost/phpmyadmin/).
2. Create the database required by the application.
3. Import the project's SQL file, if included.
4. Update the database connection settings in the project configuration file.

Ensure that the database name, username, and password match your local MySQL configuration.

### Step 5: Run the Application

Open your browser and navigate to:

```text
http://localhost/Community-Food-Wastage-Reduction-Portal-/
```

Adjust the URL if your project folder has a different name or the application uses a specific entry page.

## 👥 User Roles

- **Donor:** Shares surplus food by creating and managing donation listings.
- **Recipient:** Searches for available food, claims donations, and confirms delivery.
- **Administrator:** Oversees users and donation records.

## 🔄 Donation Workflow

1. A donor registers or logs in.
2. The donor adds a food donation with the required details.
3. A recipient searches for available donations.
4. The recipient claims a suitable donation.
5. The donation status is updated as the process progresses.
6. The recipient confirms delivery after receiving the food.

## 🔒 Security and Validation

The application should validate user inputs, protect account credentials, restrict access according to user roles, and prevent invalid or duplicate donation operations. Server-side validation should complement client-side validation.

## 🚀 Future Enhancements

- Real-time notifications for newly available nearby donations.
- Integration with interactive maps and route directions.
- Email or SMS notifications.
- Improved donor and recipient verification.
- Advanced search and filtering options.
- Detailed analytics and reports on food donations and waste reduction.

## 🎓 Academic Project

- **Project Title:** Community Food Wastage Reduction Portal
- **Project Type:** Web Application
- **Domain:** Food Donation and Waste Reduction

This project demonstrates how web technologies can help connect surplus food providers with organizations and communities that need food.

## 🤝 Contributing

Suggestions for improving the project are welcome. Contributors can fork the repository, make changes on a separate branch, and submit a pull request.

## 📄 License

No license has been specified yet. Contact the repository owner before reusing or redistributing the project.

---

**Together, we can reduce food waste and help build a community where surplus food reaches people in need.** 🌍❤️
git status