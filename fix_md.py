import os
import glob
import re

replacements = [
    (r"Node\.js 20\+", "Python 3.10+"),
    (r"Node\.js", "Python"),
    (r"Express\.js", "FastAPI"),
    (r"Express", "FastAPI"),
    (r"pg \(node-postgres\) for database", "supabase-py for database interactions"),
    (r"PostgreSQL 14\+", "Supabase (PostgreSQL)"),
    (r"PostgreSQL", "Supabase"),
    (r"jsonwebtoken for JWT", "Supabase Auth for JWT"),
    (r"JWT \(jsonwebtoken\)", "Supabase Auth (JWT)"),
    (r"bcrypt \(şifre hashleme\)", "Supabase Auth"),
    (r"bcrypt for password hashing", "Supabase Auth for password management"),
    (r"express-validator for validation", "Pydantic for validation"),
    (r"express-validator", "Pydantic"),
    (r"React 18\+", "React 18+ (Vite, TypeScript, Tailwind)"),
    (r"npm test", "pytest"),
    (r"npm run test:watch", "pytest-watch"),
    (r"npm run dev", "uvicorn main:app --reload"),
    (r"\.jsx", ".tsx"),
    (r"controllers/authController\.js", "app/api/auth.py"),
    (r"routes/authRoutes\.js", "app/api/auth.py"),
    (r"middleware/authMiddleware\.js", "app/core/security.py"),
    (r"validators/authValidators\.js", "app/schemas/user.py"),
    (r"utils/hashPassword\.js", "app/core/security.py"),
    (r"services/authService\.js", "services/authService.ts"),
    (r"utils/validators\.js", "utils/validators.ts"),
]

md_files = glob.glob("*.md")

for file_name in md_files:
    with open(file_name, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements:
        new_content = re.sub(old, new, new_content)
    
    # Custom replacement for backend install steps
    backend_install_old = """# Backend dizinine git
cd backend

# Bağımlılıkları yükle
npm install"""

    backend_install_new = """# Backend dizinine git
cd backend

# Virtual environment oluştur ve aktif et
python3 -m venv venv
source venv/bin/activate

# Bağımlılıkları yükle
pip install -r requirements.txt"""

    new_content = new_content.replace(backend_install_old, backend_install_new)
    
    if new_content != content:
        with open(file_name, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {file_name}")

