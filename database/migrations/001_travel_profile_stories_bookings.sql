USE trip_companion;

CREATE TABLE IF NOT EXISTS user_travel_profiles (
 user_id BIGINT UNSIGNED PRIMARY KEY,
 travel_mode ENUM('solo','with_others','both') NOT NULL DEFAULT 'both',
 account_roles VARCHAR(60) NOT NULL DEFAULT 'traveler',
 home_currency CHAR(3) NOT NULL DEFAULT 'INR',
 languages VARCHAR(300) NULL,
 interests VARCHAR(500) NULL,
 guide_name VARCHAR(120) NULL,
 guide_locations VARCHAR(250) NULL,
 guide_bio VARCHAR(500) NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS community_stories (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 title VARCHAR(100) NOT NULL,
 destination VARCHAR(120) NOT NULL,
 story_type ENUM('Local tip','Travel story','Food find','Guide note') NOT NULL DEFAULT 'Travel story',
 body VARCHAR(1400) NOT NULL,
 image_mime VARCHAR(30) NULL,
 image_data MEDIUMBLOB NULL,
 status ENUM('published','removed') NOT NULL DEFAULT 'published',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_stories_feed(status,created_at),
 INDEX idx_stories_destination(destination,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trip_bookings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 trip_id BIGINT UNSIGNED NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 booking_type ENUM('Hotel','Flight','Train','Transport','Experience','Other') NOT NULL DEFAULT 'Other',
 title VARCHAR(120) NOT NULL,
 provider VARCHAR(100) NULL,
 start_date DATE NULL,
 end_date DATE NULL,
 amount_minor BIGINT UNSIGNED NULL,
 currency CHAR(3) NOT NULL,
 booking_url VARCHAR(1000) NULL,
 notes VARCHAR(500) NULL,
 status ENUM('planned','confirmed','cancelled') NOT NULL DEFAULT 'planned',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
 FOREIGN KEY(created_by) REFERENCES users(id),
 INDEX idx_bookings_trip_date(trip_id,start_date)
) ENGINE=InnoDB;
