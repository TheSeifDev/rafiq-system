# Database Tables

## Supabase Tables (13 tables)

### 1. `users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | User ID |
| email | TEXT | Email address |
| role | TEXT | User role (admin/user) |
| created_at | TIMESTAMPTZ | Creation date |

### 2. `reviews`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Review ID |
| name | TEXT | Reviewer name |
| rating | INTEGER | Star rating (1-5) |
| text | TEXT | Review content |
| featured | BOOLEAN | Spotlight flag |
| approved | BOOLEAN | Approval status |
| created_at | TIMESTAMPTZ | Creation date |

### 3. `team_members`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Member ID |
| name | TEXT | Member name |
| photo | TEXT | Photo URL |
| role | TEXT | Job title |
| skill_type | TEXT | soft / hard |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |

### 4. `blog_posts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Post ID |
| title | TEXT | Post title |
| slug | TEXT | URL slug |
| excerpt | TEXT | Short summary |
| content | TEXT | Full content |
| cover_image | TEXT | Image URL |
| author_name | TEXT | Author |
| is_published | BOOLEAN | Published flag |
| published_at | TIMESTAMPTZ | Publish date |
| facebook_post_id | TEXT | FB post ID |
| facebook_permalink | TEXT | FB link |
| facebook_likes_count | INTEGER | Likes |
| facebook_comments_count | INTEGER | Comments |
| facebook_shares_count | INTEGER | Shares |
| source | TEXT | local / facebook |
| created_at | TIMESTAMPTZ | Creation date |

### 5. `links`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Link ID |
| name | TEXT | Link name |
| url | TEXT | URL |
| icon | TEXT | Icon identifier |
| category | TEXT | social / contact / external |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |
| is_in_nav | BOOLEAN | Show in navigation |

### 6. `services`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Service ID |
| title | TEXT | Service title |
| description | TEXT | Description |
| icon | TEXT | Icon name |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |

### 7. `experiences`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Experience ID |
| title | TEXT | Title |
| company | TEXT | Company name |
| description | TEXT | Description |
| period | TEXT | Time period |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |

### 8. `explore_content`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Content ID |
| title | TEXT | Title |
| description | TEXT | Description |
| image | TEXT | Image URL |
| is_active | BOOLEAN | Active status |

### 9. `media`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | File ID |
| file_name | TEXT | File name |
| file_url | TEXT | File URL |
| file_type | TEXT | MIME type |
| size | INTEGER | File size |
| bucket | TEXT | Storage bucket |
| created_at | TIMESTAMPTZ | Upload date |

### 10. `facebook_page_info`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Info ID |
| page_id | TEXT | Facebook page ID |
| page_name | TEXT | Page name |
| page_likes | INTEGER | Like count |
| page_followers | INTEGER | Follower count |
| page_picture | TEXT | Profile picture URL |
| page_link | TEXT | Page URL |
| updated_at | TIMESTAMPTZ | Last update |

### 11. `facebook_engagement_history`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | History ID |
| post_id | TEXT | Facebook post ID |
| likes | INTEGER | Like count |
| comments | INTEGER | Comment count |
| shares | INTEGER | Share count |
| recorded_at | TIMESTAMPTZ | Record time |

### 12. `contact_submissions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Submission ID |
| name | TEXT | Sender name |
| email | TEXT | Sender email |
| message | TEXT | Message content |
| created_at | TIMESTAMPTZ | Submission date |

### 13. `about_content`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Content ID |
| title | TEXT | Section title |
| content | TEXT | Content |
| image | TEXT | Image URL |
| display_order | INTEGER | Sort order |
