# CRUD Operations

## 1. Blog Posts CRUD
| Operation | Route | Method | Description |
|-----------|-------|--------|-------------|
| Create | `/api/admin/blog/create` | POST | Create new post |
| Read | `/api/admin/blog` | GET | List all posts |
| Update | `/api/admin/blog/update` | PUT | Edit post |
| Delete | `/api/admin/blog/delete` | DELETE | Remove post |

### Features:
- Sync with Facebook page
- Auto-publish to Facebook
- Track engagement (likes, comments, shares)
- Cover image upload

---

## 2. Reviews CRUD
| Operation | Route | Method | Description |
|-----------|-------|--------|-------------|
| Create | `/api/reviews` | POST | Submit review |
| Read | `/api/reviews` | GET | List approved reviews |
| Update | `/api/admin/reviews` | PUT | Approve/feature review |
| Delete | `/api/admin/reviews` | DELETE | Remove review |

### Features:
- Approval system
- Featured reviews (Spotlight)
- Star rating (1-5)
- Public display

---

## 3. Team Members CRUD
| Operation | Route | Method | Description |
|-----------|-------|--------|-------------|
| Create | `/api/team` | POST | Add member |
| Read | `/api/team` | GET | List members |
| Update | `/api/team` | PUT | Edit member |
| Delete | `/api/team` | DELETE | Remove member |

### Features:
- Skill types: Soft Skills / Hard Skills
- Photo upload
- Display order
- Active/Inactive toggle

---

## 4. Links CRUD
| Operation | Route | Method | Description |
|-----------|-------|--------|-------------|
| Create | `/api/links` | POST | Add link |
| Read | `/api/links` | GET | List links |
| Update | `/api/links` | PUT | Edit link |
| Delete | `/api/links` | DELETE | Remove link |

### Features:
- Categories: Social / Contact / External
- Custom icons (10 available)
- Navigation visibility toggle
- Display order

---

## 5. Services CRUD
| Operation | Route | Method | Description |
|-----------|-------|--------|-------------|
| Create | `/api/admin/services` | POST | Add service |
| Read | `/api/admin/services` | GET | List services |
| Update | `/api/admin/services` | PUT | Edit service |
| Delete | `/api/admin/services` | DELETE | Remove service |

### Features:
- Icon selection
- Description
- Active/Inactive toggle

---

## 6. Experience CRUD
| Operation | Route | Method | Description |
|-----------|-------|--------|-------------|
| Create | `/api/admin/experience` | POST | Add experience |
| Read | `/api/admin/experience` | GET | List experiences |
| Update | `/api/admin/experience` | PUT | Edit experience |
| Delete | `/api/admin/experience` | DELETE | Remove experience |

### Features:
- Company name
- Period
- Description
- Timeline display

---

## 7. Media CRUD
| Operation | Route | Method | Description |
|-----------|-------|--------|-------------|
| Upload | `/api/admin/media` | POST | Upload file |
| Read | `/api/admin/media` | GET | List files |
| Delete | `/api/admin/media` | DELETE | Remove file |

### Features:
- Image preview
- File details
- Search
- Pagination
