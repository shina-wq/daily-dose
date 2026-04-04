-- users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- medications table
CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  time_to_take TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- medication_logs table (tracks taken/missed per day)
CREATE TABLE IF NOT EXISTS medication_logs (
  id SERIAL PRIMARY KEY,
  medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(10) CHECK (status IN ('taken', 'missed', 'pending')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  doctor_name VARCHAR(100),
  location VARCHAR(150),
  appointment_date TIMESTAMP NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- health_logs table
CREATE TABLE IF NOT EXISTS health_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  symptoms TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);