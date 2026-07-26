import sys
import os
import subprocess
import psycopg2

def setup_postgres(pg_user="postgres", pg_password="password", host="localhost", port=5432):
    print(f"Connecting to PostgreSQL at {host}:{port} with user '{pg_user}'...")
    
    # 1. Connect to postgres database to ensure sabha_db exists
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=pg_user,
            password=pg_password,
            host=host,
            port=port
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        cur.execute("SELECT 1 FROM pg_database WHERE datname='sabha_db';")
        if not cur.fetchone():
            cur.execute("CREATE DATABASE sabha_db;")
            print("Successfully created PostgreSQL database 'sabha_db'!")
        else:
            print("Database 'sabha_db' already exists.")
        
        conn.close()
    except Exception as e:
        print(f"PostgreSQL connection error: {e}")
        return False

    # 2. Update .env with working connection string
    db_url = f"postgresql://{pg_user}:{pg_password}@{host}:{port}/sabha_db"
    
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
        with open(env_path, "w") as f:
            for line in lines:
                if line.startswith("DATABASE_URL="):
                    f.write(f'DATABASE_URL="{db_url}"\n')
                else:
                    f.write(line)
        print(f"Updated backend/.env DATABASE_URL to: {db_url}")

    # 3. Run Alembic Migrations
    print("Running Alembic migrations against PostgreSQL...")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=os.path.dirname(__file__), check=True)

    # 4. Seed database
    print("Seeding PostgreSQL database...")
    subprocess.run([sys.executable, "seed.py"], cwd=os.path.dirname(__file__), check=True)

    print("PostgreSQL setup completed successfully!")
    return True

if __name__ == "__main__":
    user = sys.argv[1] if len(sys.argv) > 1 else "postgres"
    password = sys.argv[2] if len(sys.argv) > 2 else "password"
    setup_postgres(user, password)
