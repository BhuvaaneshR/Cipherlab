# CipherLab Backend

This backend uses Flask, PostgreSQL, and bcrypt.

## Project files

- `app.py`: Flask app entrypoint
- `auth.py`: register and login endpoints
- `database.py`: PostgreSQL connection pool and user queries
- `requirements.txt`: Python dependencies

## PostgreSQL database setup

1. Install PostgreSQL and make sure the server is running.
2. Open `psql` as a superuser or a user with database creation rights.
3. Run:

```sql
CREATE DATABASE cipherlab;
```

4. Connect to the new database:

```sql
\c cipherlab
```

5. Run the schema script from the repo root:

```sql
\i database/schema.sql
```

## Backend setup

1. Create a virtual environment:

```powershell
python -m venv .venv
```

2. Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

3. Install dependencies:

```powershell
pip install -r backend\requirements.txt
```

4. Copy environment variables and update them if needed:

```powershell
Copy-Item backend\.env.example backend\.env
```

5. Start the Flask app:

```powershell
python backend\app.py
```

## Current API endpoints

- `POST /register`
- `POST /login`
- `POST /register/request-otp`
- `POST /register/verify-otp`
- `POST /login/request-otp`
- `POST /login/verify-otp`
- `GET /health`

## OTP notes

- OTPs are stored in the `email_otps` table as hashes, not plaintext.
- For local development, keep `OTP_DELIVERY_MODE=console` to print OTPs in the backend terminal.
- For real email delivery, set `OTP_DELIVERY_MODE=smtp` and fill in the SMTP settings in `backend/.env`.
