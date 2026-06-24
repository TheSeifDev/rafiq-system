# API Routes Documentation

## Authentication
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/logout` | POST | User logout |

## Public Data
| Route | Method | Description |
|-------|--------|-------------|
| `/api/about` | GET | About page data |
| `/api/contact` | POST | Contact form submission |
| `/api/explore` | GET | Explore page data |
| `/api/links` | GET | Links data |
| `/api/reviews` | GET/POST | Reviews data |
| `/api/stats` | GET | Statistics |
| `/api/team` | GET | Team members |

## Admin (Protected)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/blog` | GET | Blog posts list |
| `/api/admin/blog/create` | POST | Create post |
| `/api/admin/blog/update` | PUT | Update post |
| `/api/admin/blog/delete` | DELETE | Delete post |
| `/api/admin/reviews` | GET | Reviews list |
| `/api/admin/services` | GET/POST | Services CRUD |
| `/api/admin/experience` | GET/POST | Experience CRUD |
| `/api/admin/media` | GET/POST | Media management |
| `/api/admin/me` | GET | Current admin info |

## Facebook Integration (Optional)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/facebook/sync` | POST | Sync Facebook posts |
| `/api/admin/facebook/engagement` | GET | Get post engagement |
| `/api/admin/facebook/webhook` | POST | Facebook webhook |

**Note**: Facebook routes require `FACEBOOK_ACCESS_TOKEN` env variable.
