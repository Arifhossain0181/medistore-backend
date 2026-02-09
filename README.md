
# Medical Backend

This project is a backend API for a medical e-commerce platform. It is built with Node.js, TypeScript, Express, and Prisma ORM.

## Features
- User authentication and authorization
- Admin, seller, and user roles
- Category and medicine management
- Cart and order management
- Review system
- RESTful API structure

## Project Structure
- `src/` - Main source code
  - `auth/` - Authentication logic
  - `comPonent/` - Main business logic (Admin, Cart, Category, Medicine, Order, Profile, Review, Seller)
  - `lib/` - Utility libraries (Prisma client, auth helpers)
  - `modules/` - Additional modules and types
- `prisma/` - Prisma schema and migrations
- `generated/` - Generated Prisma client code

## Getting Started
1. Clone the repository
2. Install dependencies:
	```bash
	npm install
	```
3. Set up your database and environment variables
4. Run migrations:
	```bash
	npx prisma migrate dev
	```
5. Start the development server:
	```bash
	npm run dev
	```

## Scripts
- `seed-admin.ts` - Seed an admin user
- `seed-categories.ts` - Seed default categories
- `list-medicines.ts` - List all medicines

## API Endpoints
- Authentication: `/api/auth`
- Admin: `/api/admin`
- Category: `/api/category`
- Medicine: `/api/medicine`
- Cart: `/api/cart`
- Order: `/api/order`
- Profile: `/api/profile`
- Review: `/api/review`

## Technologies Used
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL (or your preferred database)

## License
This project is licensed under the MIT License.
