-- D1数据库表结构：用户图片记录
-- 用于存储用户上传的图片信息

CREATE TABLE IF NOT EXISTS user_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id TEXT NOT NULL UNIQUE,        -- 图片唯一ID (例如: timestamp-randomName)
    user_id TEXT NOT NULL,                -- GitHub用户ID
    r2_object_key TEXT NOT NULL,          -- R2存储的完整对象键 (user-id/image-id.jpg)
    filename TEXT NOT NULL,               -- 原始文件名
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP, -- 上传时间
    file_size INTEGER NOT NULL,           -- 文件大小(字节)
    mime_type TEXT NOT NULL,              -- MIME类型
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_upload_date ON user_images(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_images_image_id ON user_images(image_id);

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,         -- GitHub用户ID
    telegram_chat_id TEXT,                -- Telegram Chat ID
    notification_enabled INTEGER DEFAULT 1, -- 是否启用通知 (0/1)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 用户信息表
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,         -- GitHub用户ID
    username TEXT NOT NULL,               -- GitHub用户名
    email TEXT,                           -- GitHub邮箱
    avatar_url TEXT,                      -- GitHub头像URL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);