# Fleet Management System

A full-stack **Rent-a-Car Management System** designed to simplify vehicle rental operations, customer bookings, vehicle allocation, staff operations, and rental return management.

The application provides separate interfaces for customers and staff, allowing customers to explore and rent vehicles while staff members manage bookings, vehicle handovers, returns, and billing.

## Project Overview

The Fleet Management System is a web-based car rental platform developed to streamline the end-to-end vehicle rental process.

Customers can browse available vehicles, make rental bookings, select pickup and return locations, and choose additional services. Staff members can manage vehicle handovers, process returns, generate bills, and maintain fleet operations.

## Key Features

### Customer Module
- Customer registration and login.
- Secure authentication using JWT.
- Browse and explore available vehicles.
- View vehicle details and availability.
- Book rental vehicles.
- Select pickup and return locations.
- State, city, and airport selection.
- Select additional rental services.
- View rental booking information.

### Staff Module
- Staff authentication and management.
- Manage vehicle rental bookings.
- Vehicle handover management.
- Vehicle return processing.
- Rental bill generation.
- Vehicle and fleet management.
- Manage rental operations.

## Technology Stack

### Backend
- Java
- Spring Framework 6
- Spring Boot
- Spring Data JPA
- Hibernate
- RESTful APIs
- Jakarta EE
- JWT Authentication
- Maven

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3

### Database
- MySQL 8
- Spring Data JPA
- Hibernate ORM

### Additional Technologies
- Docker
- Microservices Architecture
- .NET Core 8 Web API
- Entity Framework Core 8

## Backend Architecture

The Spring Boot backend follows a layered architecture to maintain separation of concerns and improve code maintainability.

- **Entity Layer:** Database entity classes.
- **Controller Layer:** Handles incoming REST API requests.
- **Service Layer:** Implements business logic.
- **Repository Layer:** Handles database operations using JPA.
- **DTO Layer:** Transfers structured request and response data.
- **Security Layer:** Handles authentication and authorization using JWT.
