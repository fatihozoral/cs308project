# CS 308 Online Ticketing Platform - Frontend (TypeScript + Tailwind CSS)

Modern, type-safe frontend for the CS 308 university ticketing platform.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client

## Features

- ✅ Type-safe authentication flow
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ Role-based access control (customer, sales_manager, product_manager)
- ✅ Client-side form validation
- ✅ Password strength indicator
- ✅ Protected routes
- ✅ Loading states and error handling
- ✅ JWT token management

## Project Structure

```
frontend-ts/
├── src/
│   ├── context/
│   │   └── AuthContext.tsx       # Auth state management
│   ├── pages/
│   │   ├── LoginPage.tsx         # Login page
│   │   ├── RegisterPage.tsx      # Registration page
│   │   ├── HomePage.tsx          # Customer home
│   │   ├── AdminSalesPage.tsx    # Sales manager dashboard
│   │   └── AdminProductsPage.tsx # Product manager dashboard
│   ├── services/
│   │   └── authService.ts        # API calls
│   ├── types/
│   │   └── auth.types.ts         # TypeScript interfaces
│   ├── utils/
│   │   └── validators.ts         # Form validation
│   ├── App.tsx                   # Main app with routing
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will open at http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Pages

### Login Page (`/login`)
- Email and password fields
- Client-side validation
- Error messages from API
- Link to registration

### Registration Page (`/register`)
- Full name, email, password fields
- Password confirmation with strength indicator
- Tax ID (11 digits)
- Home address
- Comprehensive validation
- Link to login

### Home Page (`/`)
- Customer dashboard
- User information display
- Logout functionality

### Admin Pages
- `/admin/sales` - Sales manager dashboard
- `/admin/products` - Product manager dashboard

## Role-Based Redirects

After login, users are redirected based on their role:

- **customer** → `/` (Home page)
- **sales_manager** → `/admin/sales`
- **product_manager** → `/admin/products`

## Form Validation

All forms include both client-side and server-side validation:

### Login
- Email: Required, valid format
- Password: Required

### Registration
- Name: Min 2 characters
- Email: Valid format
- Password: Min 8 characters, uppercase + number
- Confirm Password: Must match
- Tax ID: Exactly 11 digits
- Address: Required

## API Integration

The frontend connects to the backend at `http://localhost:5000/api/auth`:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api/auth
```

## TypeScript

All components are fully typed with TypeScript for better developer experience and type safety:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

type UserRole = 'customer' | 'sales_manager' | 'product_manager';
```

## Tailwind CSS

Modern, responsive design with Tailwind CSS:

- Gradient backgrounds
- Smooth transitions
- Form styling
- Loading states
- Error states
- Responsive layouts

## Production Build

```bash
npm run build
```

The optimized production files will be in the `dist/` directory.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

**CS 308 Software Engineering - Sabancı Üniversitesi, 2026**
