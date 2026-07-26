import psycopg2

passwords = ['', 'postgres', 'root', 'admin', 'password', '123456', 'sabha']
working_pass = None

for pw in passwords:
    try:
        conn = psycopg2.connect(dbname='postgres', user='postgres', password=pw, host='localhost', port=5432, connect_timeout=2)
        working_pass = pw
        print(f"Connected to PostgreSQL successfully with password: '{pw}'")
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname='sabha_db';")
        if not cur.fetchone():
            cur.execute("CREATE DATABASE sabha_db;")
            print("Successfully created PostgreSQL database 'sabha_db'!")
        else:
            print("PostgreSQL database 'sabha_db' already exists!")
        conn.close()
        break
    except Exception as e:
        print(f"Password '{pw}' attempt result: {e}")

if working_pass is not None:
    print(f"PostgreSQL is ready! Connection string: postgresql://postgres:{working_pass}@localhost:5432/sabha_db")
else:
    print("PostgreSQL server requires explicit password or user configuration.")
