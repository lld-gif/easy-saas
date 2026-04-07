ALTER TABLE ideas ADD COLUMN difficulty int DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5);
