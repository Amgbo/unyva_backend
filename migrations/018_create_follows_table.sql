-- Create follows table for followers & following system

CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    follower_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    following_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT follows_unique_pair UNIQUE (follower_id, following_id)
);

-- Indexes for performance
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at);
