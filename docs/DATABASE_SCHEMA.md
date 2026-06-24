# Database Schema

## Tables

### `reviews`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Review ID |
| name | TEXT | Reviewer name |
| rating | INTEGER (1-5) | Star rating |
| text | TEXT | Review content |
| featured | BOOLEAN | Spotlight flag |
| approved | BOOLEAN | Approval status |
| created_at | TIMESTAMPTZ | Creation date |

### `team_members`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Member ID |
| name | TEXT | Member name |
| photo | TEXT (nullable) | Photo URL |
| role | TEXT (nullable) | Job title |
| skill_type | TEXT | "soft" or "hard" |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |

### `blog_posts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Post ID |
| title | TEXT | Post title |
| slug | TEXT | URL slug |
| excerpt | TEXT | Short summary |
| content | TEXT | Full content |
| cover_image | TEXT (nullable) | Image URL |
| author_name | TEXT (nullable) | Author |
| is_published | BOOLEAN | Published flag |
| published_at | TIMESTAMPTZ (nullable) | Publish date |
| facebook_post_id | TEXT (nullable) | FB post ID |
| facebook_permalink | TEXT (nullable) | FB link |
| facebook_likes_count | INTEGER | Like count |
| facebook_comments_count | INTEGER | Comment count |
| facebook_shares_count | INTEGER | Share count |
| source | TEXT | "local" or "facebook" |
| created_at | TIMESTAMPTZ | Creation date |

### `links`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Link ID |
| name | TEXT | Link name |
| url | TEXT | URL |
| icon | TEXT | Icon identifier |
| category | TEXT | "social", "contact", "external" |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |
| is_in_nav | BOOLEAN | Show in navigation |

### `services`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Service ID |
| title | TEXT | Service title |
| description | TEXT | Description |
| icon | TEXT | Icon name |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |

### `experience`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Experience ID |
| title | TEXT | Title |
| company | TEXT | Company name |
| description | TEXT | Description |
| period | TEXT | Time period |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Sort order |
