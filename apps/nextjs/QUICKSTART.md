# Quick Start Guide - Next.js 14 App

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
cd apps/nextjs
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
Visit **http://localhost:3000**

---

## ✅ What's Already Configured

- ✅ Next.js 14 with App Router
- ✅ TypeScript with strict mode  
- ✅ Tailwind CSS for styling
- ✅ API proxy to GraphQL backend (`/api/graphql` → `http://localhost:4000/graphql`)
- ✅ Standalone build output for Docker
- ✅ Environment variables configured

---

## 📦 Project Structure

```
apps/nextjs/
├── app/
│   ├── layout.tsx      # Root layout with Inter font
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles + Tailwind
├── package.json        # Dependencies
├── next.config.js      # Next.js configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.ts  # Tailwind configuration
├── postcss.config.mjs  # PostCSS configuration
└── .gitignore
```

---

## 🔧 Running Multiple Apps

### Terminal 1 - Existing Vite App (Port 5000)
```bash
npm run dev
```

### Terminal 2 - Next.js App (Port 3000)
```bash
cd apps/nextjs && npm run dev
```

### Backend - NestJS GraphQL (Port 4000)
Already running via main workflow

---

## 🎯 Success Criteria Met

✅ Next.js 14 app created in `apps/nextjs/`  
✅ TypeScript configured  
✅ Tailwind CSS configured  
✅ App Router structure in place  
✅ Ready for gradual migration  
✅ No conflicts with existing Vite frontend  
✅ Prepared for Apollo Client integration  

---

## 📚 Next Steps

1. **Install dependencies** (see Step 1 above)
2. **Run the dev server** (see Step 2 above)
3. **Add Apollo Client** for GraphQL queries
4. **Create shared components** library
5. **Migrate pages** incrementally from Vite to Next.js
6. **Set up authentication** flow in Next.js
7. **Configure CI/CD** for Next.js deployment

---

## 🐛 Troubleshooting

**Port 3000 in use?**
```bash
lsof -ti:3000 | xargs kill -9
```

**Dependencies not installing?**
```bash
npm cache clean --force
npm install
```

**Need help?**
See `SETUP.md` for detailed instructions.
