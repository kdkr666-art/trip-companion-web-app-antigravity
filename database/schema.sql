CREATE DATABASE IF NOT EXISTS trip_companion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trip_companion;
CREATE TABLE users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, display_name VARCHAR(70) NOT NULL,
 email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 city VARCHAR(70), bio VARCHAR(350), is_admin TINYINT(1) NOT NULL DEFAULT 0,
 is_blocked TINYINT(1) NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE user_travel_profiles (
 user_id BIGINT UNSIGNED PRIMARY KEY,
 travel_mode ENUM('solo','with_others','both') NOT NULL DEFAULT 'both',
 account_roles VARCHAR(60) NOT NULL DEFAULT 'traveler', home_currency CHAR(3) NOT NULL DEFAULT 'INR',
 languages VARCHAR(300) NULL, interests VARCHAR(500) NULL,
 guide_name VARCHAR(120) NULL, guide_locations VARCHAR(250) NULL, guide_bio VARCHAR(500) NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE trips (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, owner_id BIGINT UNSIGNED NOT NULL,
 title VARCHAR(100) NOT NULL, destination VARCHAR(120) NOT NULL, start_date DATE NOT NULL,
 end_date DATE NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'INR', budget_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
 description VARCHAR(500), interests VARCHAR(180), visibility ENUM('public','invite_only') NOT NULL DEFAULT 'invite_only',
 status ENUM('open','completed','cancelled','archived') NOT NULL DEFAULT 'open', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(owner_id) REFERENCES users(id), INDEX idx_trip_search(visibility,status,destination,start_date)
) ENGINE=InnoDB;
CREATE TABLE trip_members (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
 role ENUM('owner','member') NOT NULL DEFAULT 'member', status ENUM('pending','accepted','declined','removed') NOT NULL DEFAULT 'pending',
 joined_at TIMESTAMP NULL, UNIQUE KEY uq_trip_member(trip_id,user_id),
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE join_requests (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
 status ENUM('pending','accepted','declined','withdrawn') NOT NULL DEFAULT 'pending', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, reviewed_at TIMESTAMP NULL,
 UNIQUE KEY uq_trip_request(trip_id,user_id), FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE invitations (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL, email VARCHAR(254) NOT NULL,
 user_id BIGINT UNSIGNED NULL, invited_by BIGINT UNSIGNED NOT NULL, invite_code CHAR(48) NOT NULL UNIQUE,
 status ENUM('pending','accepted','declined','revoked','expired') NOT NULL DEFAULT 'pending',
 expires_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_invite(trip_id,email),
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(invited_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE expenses (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL, created_by BIGINT UNSIGNED NOT NULL,
 description VARCHAR(120) NOT NULL, category ENUM('food','transport','stay','activities','shopping','other') NOT NULL DEFAULT 'other',
 amount_minor BIGINT UNSIGNED NOT NULL, currency CHAR(3) NOT NULL, payer_id BIGINT UNSIGNED NOT NULL,
 expense_date DATE NOT NULL, split_method ENUM('equal','custom') NOT NULL DEFAULT 'equal', note VARCHAR(500),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE, FOREIGN KEY(created_by) REFERENCES users(id), FOREIGN KEY(payer_id) REFERENCES users(id),
 INDEX idx_expense_trip_date(trip_id,expense_date)
) ENGINE=InnoDB;
CREATE TABLE expense_shares (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, expense_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
 amount_minor BIGINT UNSIGNED NOT NULL, UNIQUE KEY uq_expense_share(expense_id,user_id),
 FOREIGN KEY(expense_id) REFERENCES expenses(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE settlements (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL, from_user_id BIGINT UNSIGNED NOT NULL,
 to_user_id BIGINT UNSIGNED NOT NULL, amount_minor BIGINT UNSIGNED NOT NULL, currency CHAR(3) NOT NULL,
 status ENUM('recorded_paid','reversed') NOT NULL DEFAULT 'recorded_paid', paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 recorded_by BIGINT UNSIGNED NOT NULL, FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
 FOREIGN KEY(from_user_id) REFERENCES users(id), FOREIGN KEY(to_user_id) REFERENCES users(id), FOREIGN KEY(recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE itinerary_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL, created_by BIGINT UNSIGNED NOT NULL,
 title VARCHAR(120) NOT NULL, kind VARCHAR(30) NOT NULL DEFAULT 'Other', item_date DATE, start_time TIME,
 place VARCHAR(180), note VARCHAR(500), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE, FOREIGN KEY(created_by) REFERENCES users(id),
 INDEX idx_item_schedule(trip_id,item_date,start_time)
) ENGINE=InnoDB;
CREATE TABLE user_reports (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reporter_id BIGINT UNSIGNED NOT NULL, target_user_id BIGINT UNSIGNED NOT NULL,
 trip_id BIGINT UNSIGNED NULL, reason VARCHAR(90) NOT NULL, details VARCHAR(1000) NOT NULL,
 status ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_by BIGINT UNSIGNED NULL, reviewed_at TIMESTAMP NULL, FOREIGN KEY(reporter_id) REFERENCES users(id),
 FOREIGN KEY(target_user_id) REFERENCES users(id), FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL,
 FOREIGN KEY(reviewed_by) REFERENCES users(id), INDEX idx_report_queue(status,created_at)
) ENGINE=InnoDB;
CREATE TABLE chat_messages (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL,
 sender_id BIGINT UNSIGNED NOT NULL, recipient_id BIGINT UNSIGNED NULL,
 body VARCHAR(1000) NOT NULL, sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
 FOREIGN KEY(sender_id) REFERENCES users(id), FOREIGN KEY(recipient_id) REFERENCES users(id),
 INDEX idx_chat_trip_time(trip_id,sent_at), INDEX idx_chat_private(trip_id,sender_id,recipient_id)
) ENGINE=InnoDB;
CREATE TABLE trip_memories (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL,
 uploaded_by BIGINT UNSIGNED NOT NULL, caption VARCHAR(100) NOT NULL, memory_date DATE NOT NULL,
 place VARCHAR(120) NULL, image_mime VARCHAR(30) NULL, image_data MEDIUMBLOB NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
 FOREIGN KEY(uploaded_by) REFERENCES users(id), INDEX idx_memory_trip_date(trip_id,memory_date)
) ENGINE=InnoDB;
CREATE TABLE community_stories (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
 title VARCHAR(100) NOT NULL, destination VARCHAR(120) NOT NULL,
 story_type ENUM('Local tip','Travel story','Food find','Guide note') NOT NULL DEFAULT 'Travel story',
 body VARCHAR(1400) NOT NULL, image_mime VARCHAR(30) NULL, image_data MEDIUMBLOB NULL,
 status ENUM('published','removed') NOT NULL DEFAULT 'published',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_stories_feed(status,created_at), INDEX idx_stories_destination(destination,created_at)
) ENGINE=InnoDB;
CREATE TABLE trip_bookings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT UNSIGNED NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 booking_type ENUM('Hotel','Flight','Train','Transport','Experience','Other') NOT NULL DEFAULT 'Other',
 title VARCHAR(120) NOT NULL, provider VARCHAR(100) NULL,
 start_date DATE NULL, end_date DATE NULL, amount_minor BIGINT UNSIGNED NULL,
 currency CHAR(3) NOT NULL, booking_url VARCHAR(1000) NULL,
 notes VARCHAR(500) NULL,
 status ENUM('planned','confirmed','cancelled') NOT NULL DEFAULT 'planned',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
 FOREIGN KEY(created_by) REFERENCES users(id),
 INDEX idx_bookings_trip_date(trip_id,start_date)
) ENGINE=InnoDB;
