
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_permissions": {
                  Row: {
                    "code": string,"description": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"description": string
                  }
                  Update: {
                    "code"?: string,"description"?: string
                  }
                  Relationships: [
                    
                  ]
                },"admin_role_permissions": {
                  Row: {
                    "permission_code": string,"role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "permission_code": string,"role_id": string
                  }
                  Update: {
                    "permission_code"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_role_permissions_permission_code_fkey"
      columns: ["permission_code"]
isOneToOne: false
      referencedRelation: "admin_permissions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "admin_role_permissions_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "admin_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_roles": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"admin_user_roles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"role_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_user_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "admin_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"changes": Json | null,"created_at": string,"entity": string,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"changes"?: Json | null,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"changes"?: Json | null,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"automation_jobs": {
                  Row: {
                    "attempts": number,"created_at": string,"event": string,"id": number,"last_error": string | null,"payload": NonNullable<Json>,"rule_id": string | null,"run_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"event": string,"id"?: never,"last_error"?: string | null,"payload"?: NonNullable<Json>,"rule_id"?: string | null,"run_at"?: string,"status"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"event"?: string,"id"?: never,"last_error"?: string | null,"payload"?: NonNullable<Json>,"rule_id"?: string | null,"run_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "automation_jobs_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "automation_rules"
      referencedColumns: ["id"]
    }
                  ]
                },"automation_rules": {
                  Row: {
                    "channel": string,"config": NonNullable<Json>,"event": string,"id": string,"is_active": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"config"?: NonNullable<Json>,"event": string,"id"?: string,"is_active"?: boolean
                  }
                  Update: {
                    "channel"?: string,"config"?: NonNullable<Json>,"event"?: string,"id"?: string,"is_active"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"banners": {
                  Row: {
                    "created_at": string,"ends_at": string | null,"id": string,"image_url": string | null,"is_active": boolean,"link_url": string | null,"placement": string,"sort_order": number,"starts_at": string | null,"subtitle": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"placement"?: string,"sort_order"?: number,"starts_at"?: string | null,"subtitle"?: string | null,"title": string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"placement"?: string,"sort_order"?: number,"starts_at"?: string | null,"subtitle"?: string | null,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blog_categories": {
                  Row: {
                    "id": string,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blog_posts": {
                  Row: {
                    "author_id": string | null,"body": string | null,"category_id": string | null,"cover_image_url": string | null,"created_at": string,"excerpt": string | null,"id": string,"published_at": string | null,"seo_description": string | null,"seo_title": string | null,"slug": string,"status": string,"tags": (string)[],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string | null,"category_id"?: string | null,"cover_image_url"?: string | null,"created_at"?: string,"excerpt"?: string | null,"id"?: string,"published_at"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"status"?: string,"tags"?: (string)[],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string | null,"category_id"?: string | null,"cover_image_url"?: string | null,"created_at"?: string,"excerpt"?: string | null,"id"?: string,"published_at"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"status"?: string,"tags"?: (string)[],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blog_posts_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "blog_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"brands": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"logo_url": string | null,"name": string,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"logo_url"?: string | null,"name": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"logo_url"?: string | null,"name"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"business_accounts": {
                  Row: {
                    "company_name": string,"company_number": string | null,"created_at": string,"discount_percent": number,"id": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_name": string,"company_number"?: string | null,"created_at"?: string,"discount_percent"?: number,"id"?: string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "company_name"?: string,"company_number"?: string | null,"created_at"?: string,"discount_percent"?: number,"id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"business_quote_items": {
                  Row: {
                    "description": string,"id": string,"quantity": number,"quote_id": string,"unit_price": number,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"id"?: string,"quantity": number,"quote_id": string,"unit_price": number,"variant_id"?: string | null
                  }
                  Update: {
                    "description"?: string,"id"?: string,"quantity"?: number,"quote_id"?: string,"unit_price"?: number,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_quote_items_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "business_quotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_quote_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_quote_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"business_quotes": {
                  Row: {
                    "created_at": string,"id": string,"lead_id": string | null,"notes": string | null,"status": string,"total": number,"updated_at": string,"user_id": string | null,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lead_id"?: string | null,"notes"?: string | null,"status"?: string,"total"?: number,"updated_at"?: string,"user_id"?: string | null,"valid_until"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lead_id"?: string | null,"notes"?: string | null,"status"?: string,"total"?: number,"updated_at"?: string,"user_id"?: string | null,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_quotes_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"cart_items": {
                  Row: {
                    "cart_id": string,"created_at": string,"id": string,"quantity": number,"updated_at": string,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cart_id": string,"created_at"?: string,"id"?: string,"quantity": number,"updated_at"?: string,"variant_id": string
                  }
                  Update: {
                    "cart_id"?: string,"created_at"?: string,"id"?: string,"quantity"?: number,"updated_at"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cart_items_cart_id_fkey"
      columns: ["cart_id"]
isOneToOne: false
      referencedRelation: "carts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cart_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cart_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"carts": {
                  Row: {
                    "coupon_code": string | null,"created_at": string,"email": string | null,"id": string,"status": string,"token": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "coupon_code"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"status"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "coupon_code"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"status"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "banner_url": string | null,"created_at": string,"description": string | null,"id": string,"image_url": string | null,"is_active": boolean,"name": string,"parent_id": string | null,"seo_description": string | null,"seo_title": string | null,"show_on_home": boolean,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "banner_url"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name": string,"parent_id"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"show_on_home"?: boolean,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "banner_url"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name"?: string,"parent_id"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"show_on_home"?: boolean,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"collection_products": {
                  Row: {
                    "collection_id": string,"product_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "collection_id": string,"product_id": string,"sort_order"?: number
                  }
                  Update: {
                    "collection_id"?: string,"product_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_products_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collection_products_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collection_products_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"collections": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"image_url": string | null,"is_active": boolean,"name": string,"seo_description": string | null,"seo_title": string | null,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name": string,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name"?: string,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"coupon_redemptions": {
                  Row: {
                    "coupon_id": string,"created_at": string,"email": string,"id": string,"order_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coupon_id": string,"created_at"?: string,"email": string,"id"?: string,"order_id": string
                  }
                  Update: {
                    "coupon_id"?: string,"created_at"?: string,"email"?: string,"id"?: string,"order_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coupon_redemptions_coupon_id_fkey"
      columns: ["coupon_id"]
isOneToOne: false
      referencedRelation: "coupons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coupon_redemptions_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"coupons": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"ends_at": string | null,"id": string,"is_active": boolean,"is_stackable": boolean,"kind": string,"min_order": number,"per_customer_limit": number | null,"starts_at": string | null,"updated_at": string,"usage_limit": number | null,"used_count": number,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"is_stackable"?: boolean,"kind": string,"min_order"?: number,"per_customer_limit"?: number | null,"starts_at"?: string | null,"updated_at"?: string,"usage_limit"?: number | null,"used_count"?: number,"value"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"is_stackable"?: boolean,"kind"?: string,"min_order"?: number,"per_customer_limit"?: number | null,"starts_at"?: string | null,"updated_at"?: string,"usage_limit"?: number | null,"used_count"?: number,"value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"customer_addresses": {
                  Row: {
                    "apartment": string | null,"city": string,"created_at": string,"full_name": string,"house_number": string,"id": string,"is_default": boolean,"label": string | null,"notes": string | null,"phone": string,"street": string,"user_id": string,"zip": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "apartment"?: string | null,"city": string,"created_at"?: string,"full_name": string,"house_number": string,"id"?: string,"is_default"?: boolean,"label"?: string | null,"notes"?: string | null,"phone": string,"street": string,"user_id": string,"zip"?: string | null
                  }
                  Update: {
                    "apartment"?: string | null,"city"?: string,"created_at"?: string,"full_name"?: string,"house_number"?: string,"id"?: string,"is_default"?: boolean,"label"?: string | null,"notes"?: string | null,"phone"?: string,"street"?: string,"user_id"?: string,"zip"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"customer_notes": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"note": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"note": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"faqs": {
                  Row: {
                    "answer": string,"id": string,"is_active": boolean,"product_id": string | null,"question": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"id"?: string,"is_active"?: boolean,"product_id"?: string | null,"question": string,"sort_order"?: number
                  }
                  Update: {
                    "answer"?: string,"id"?: string,"is_active"?: boolean,"product_id"?: string | null,"question"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "faqs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "faqs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"integration_events": {
                  Row: {
                    "created_at": string,"direction": string,"id": number,"integration": string,"payload": Json | null,"status": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"direction": string,"id"?: never,"integration": string,"payload"?: Json | null,"status"?: string,"type": string
                  }
                  Update: {
                    "created_at"?: string,"direction"?: string,"id"?: never,"integration"?: string,"payload"?: Json | null,"status"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inventory": {
                  Row: {
                    "allow_backorder": boolean,"low_stock_threshold": number,"on_hand": number,"reserved": number,"updated_at": string,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_backorder"?: boolean,"low_stock_threshold"?: number,"on_hand"?: number,"reserved"?: number,"updated_at"?: string,"variant_id": string
                  }
                  Update: {
                    "allow_backorder"?: boolean,"low_stock_threshold"?: number,"on_hand"?: number,"reserved"?: number,"updated_at"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: true
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: true
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_movements": {
                  Row: {
                    "created_at": string,"created_by": string | null,"delta": number,"id": number,"note": string | null,"order_id": string | null,"reason": string,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"delta": number,"id"?: never,"note"?: string | null,"order_id"?: string | null,"reason": string,"variant_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"delta"?: number,"id"?: never,"note"?: string | null,"order_id"?: string | null,"reason"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_reservations": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"order_id": string,"quantity": number,"status": string,"updated_at": string,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"order_id": string,"quantity": number,"status"?: string,"updated_at"?: string,"variant_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"order_id"?: string,"quantity"?: number,"status"?: string,"updated_at"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_reservations_order_fk"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_reservations_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_reservations_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"email": string | null,"full_name": string | null,"id": string,"kind": string,"message": string | null,"phone": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"email"?: string | null,"full_name"?: string | null,"id"?: string,"kind"?: string,"message"?: string | null,"phone"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"email"?: string | null,"full_name"?: string | null,"id"?: string,"kind"?: string,"message"?: string | null,"phone"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"navigation_items": {
                  Row: {
                    "id": string,"is_active": boolean,"label": string,"menu_id": string,"parent_id": string | null,"sort_order": number,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_active"?: boolean,"label": string,"menu_id": string,"parent_id"?: string | null,"sort_order"?: number,"url": string
                  }
                  Update: {
                    "id"?: string,"is_active"?: boolean,"label"?: string,"menu_id"?: string,"parent_id"?: string | null,"sort_order"?: number,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "navigation_items_menu_id_fkey"
      columns: ["menu_id"]
isOneToOne: false
      referencedRelation: "navigation_menus"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "navigation_items_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "navigation_items"
      referencedColumns: ["id"]
    }
                  ]
                },"navigation_menus": {
                  Row: {
                    "code": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"id"?: string,"name": string
                  }
                  Update: {
                    "code"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"newsletter_subscribers": {
                  Row: {
                    "consent_at": string,"email": string,"id": string,"source": string | null,"unsubscribed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at"?: string,"email": string,"id"?: string,"source"?: string | null,"unsubscribed_at"?: string | null
                  }
                  Update: {
                    "consent_at"?: string,"email"?: string,"id"?: string,"source"?: string | null,"unsubscribed_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": number,"kind": string,"link": string | null,"permission_code": string | null,"read_at": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: never,"kind": string,"link"?: string | null,"permission_code"?: string | null,"read_at"?: string | null,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: never,"kind"?: string,"link"?: string | null,"permission_code"?: string | null,"read_at"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_permission_code_fkey"
      columns: ["permission_code"]
isOneToOne: false
      referencedRelation: "admin_permissions"
      referencedColumns: ["code"]
    }
                  ]
                },"order_addresses": {
                  Row: {
                    "apartment": string | null,"city": string,"full_name": string,"house_number": string,"id": string,"kind": string,"notes": string | null,"order_id": string,"phone": string,"street": string,"zip": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "apartment"?: string | null,"city": string,"full_name": string,"house_number": string,"id"?: string,"kind"?: string,"notes"?: string | null,"order_id": string,"phone": string,"street": string,"zip"?: string | null
                  }
                  Update: {
                    "apartment"?: string | null,"city"?: string,"full_name"?: string,"house_number"?: string,"id"?: string,"kind"?: string,"notes"?: string | null,"order_id"?: string,"phone"?: string,"street"?: string,"zip"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_addresses_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"data": NonNullable<Json>,"id": number,"is_internal": boolean,"order_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"is_internal"?: boolean,"order_id": string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"is_internal"?: boolean,"order_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "id": string,"image_url": string | null,"line_total": number,"options": NonNullable<Json>,"order_id": string,"product_id": string | null,"product_name": string,"quantity": number,"sku": string,"unit_price": number,"variant_id": string | null,"variant_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"image_url"?: string | null,"line_total": number,"options"?: NonNullable<Json>,"order_id": string,"product_id"?: string | null,"product_name": string,"quantity": number,"sku": string,"unit_price": number,"variant_id"?: string | null,"variant_name"?: string | null
                  }
                  Update: {
                    "id"?: string,"image_url"?: string | null,"line_total"?: number,"options"?: NonNullable<Json>,"order_id"?: string,"product_id"?: string | null,"product_name"?: string,"quantity"?: number,"sku"?: string,"unit_price"?: number,"variant_id"?: string | null,"variant_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "cancel_reason": string | null,"cart_id": string | null,"company_name": string | null,"company_number": string | null,"coupon_code": string | null,"created_at": string,"currency": string,"customer_email": string,"customer_name": string,"customer_note": string | null,"customer_phone": string,"customer_type": Database["public"]['Enums']["customer_type"],"discount_total": number,"id": string,"order_number": number,"paid_at": string | null,"payment_status": Database["public"]['Enums']["payment_status"],"placed_at": string,"public_token": string,"reservation_expires_at": string | null,"shipping_method_id": string | null,"shipping_method_name": string,"shipping_total": number,"status": Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"tracking_number": string | null,"updated_at": string,"user_id": string | null,"vat_amount": number,"vat_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cart_id"?: string | null,"company_name"?: string | null,"company_number"?: string | null,"coupon_code"?: string | null,"created_at"?: string,"currency"?: string,"customer_email": string,"customer_name": string,"customer_note"?: string | null,"customer_phone": string,"customer_type"?: Database["public"]['Enums']["customer_type"],"discount_total"?: number,"id"?: string,"order_number"?: number,"paid_at"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"placed_at"?: string,"public_token"?: string,"reservation_expires_at"?: string | null,"shipping_method_id"?: string | null,"shipping_method_name": string,"shipping_total"?: number,"status"?: Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"tracking_number"?: string | null,"updated_at"?: string,"user_id"?: string | null,"vat_amount": number,"vat_rate": number
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cart_id"?: string | null,"company_name"?: string | null,"company_number"?: string | null,"coupon_code"?: string | null,"created_at"?: string,"currency"?: string,"customer_email"?: string,"customer_name"?: string,"customer_note"?: string | null,"customer_phone"?: string,"customer_type"?: Database["public"]['Enums']["customer_type"],"discount_total"?: number,"id"?: string,"order_number"?: number,"paid_at"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"placed_at"?: string,"public_token"?: string,"reservation_expires_at"?: string | null,"shipping_method_id"?: string | null,"shipping_method_name"?: string,"shipping_total"?: number,"status"?: Database["public"]['Enums']["order_status"],"subtotal"?: number,"total"?: number,"tracking_number"?: string | null,"updated_at"?: string,"user_id"?: string | null,"vat_amount"?: number,"vat_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_cart_id_fkey"
      columns: ["cart_id"]
isOneToOne: false
      referencedRelation: "carts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_shipping_method_id_fkey"
      columns: ["shipping_method_id"]
isOneToOne: false
      referencedRelation: "shipping_methods"
      referencedColumns: ["id"]
    }
                  ]
                },"page_sections": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"ends_at": string | null,"hide_on_mobile": boolean,"id": string,"is_active": boolean,"kind": string,"page_id": string,"sort_order": number,"starts_at": string | null,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"ends_at"?: string | null,"hide_on_mobile"?: boolean,"id"?: string,"is_active"?: boolean,"kind": string,"page_id": string,"sort_order"?: number,"starts_at"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"ends_at"?: string | null,"hide_on_mobile"?: boolean,"id"?: string,"is_active"?: boolean,"kind"?: string,"page_id"?: string,"sort_order"?: number,"starts_at"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "page_sections_page_id_fkey"
      columns: ["page_id"]
isOneToOne: false
      referencedRelation: "pages"
      referencedColumns: ["id"]
    }
                  ]
                },"pages": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"is_system": boolean,"noindex": boolean,"seo_description": string | null,"seo_title": string | null,"slug": string,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"is_system"?: boolean,"noindex"?: boolean,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"is_system"?: boolean,"noindex"?: boolean,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payment_events": {
                  Row: {
                    "created_at": string,"error": string | null,"event_id": string,"id": number,"order_id": string | null,"payload": NonNullable<Json>,"processed_at": string | null,"provider": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"event_id": string,"id"?: never,"order_id"?: string | null,"payload": NonNullable<Json>,"processed_at"?: string | null,"provider": string,"type": string
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"event_id"?: string,"id"?: never,"order_id"?: string | null,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"provider"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"currency": string,"failure_reason": string | null,"id": string,"order_id": string,"provider": string,"provider_ref": string | null,"raw": Json | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"currency"?: string,"failure_reason"?: string | null,"id"?: string,"order_id": string,"provider": string,"provider_ref"?: string | null,"raw"?: Json | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"currency"?: string,"failure_reason"?: string | null,"id"?: string,"order_id"?: string,"provider"?: string,"provider_ref"?: string | null,"raw"?: Json | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"product_attribute_assignments": {
                  Row: {
                    "attribute_value_id": string,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attribute_value_id": string,"product_id": string
                  }
                  Update: {
                    "attribute_value_id"?: string,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_attribute_assignments_attribute_value_id_fkey"
      columns: ["attribute_value_id"]
isOneToOne: false
      referencedRelation: "product_attribute_values"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_attribute_assignments_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_attribute_assignments_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_attribute_values": {
                  Row: {
                    "attribute_id": string,"color_hex": string | null,"id": string,"sort_order": number,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attribute_id": string,"color_hex"?: string | null,"id"?: string,"sort_order"?: number,"value": string
                  }
                  Update: {
                    "attribute_id"?: string,"color_hex"?: string | null,"id"?: string,"sort_order"?: number,"value"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_attribute_values_attribute_id_fkey"
      columns: ["attribute_id"]
isOneToOne: false
      referencedRelation: "product_attributes"
      referencedColumns: ["id"]
    }
                  ]
                },"product_attributes": {
                  Row: {
                    "code": string,"id": string,"is_filterable": boolean,"kind": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"id"?: string,"is_filterable"?: boolean,"kind"?: string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"id"?: string,"is_filterable"?: boolean,"kind"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"product_categories": {
                  Row: {
                    "category_id": string,"is_primary": boolean,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"is_primary"?: boolean,"product_id": string
                  }
                  Update: {
                    "category_id"?: string,"is_primary"?: boolean,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_categories_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_categories_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_images": {
                  Row: {
                    "alt": string | null,"created_at": string,"id": string,"is_primary": boolean,"product_id": string,"sort_order": number,"storage_path": string | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string | null,"created_at"?: string,"id"?: string,"is_primary"?: boolean,"product_id": string,"sort_order"?: number,"storage_path"?: string | null,"url": string
                  }
                  Update: {
                    "alt"?: string | null,"created_at"?: string,"id"?: string,"is_primary"?: boolean,"product_id"?: string,"sort_order"?: number,"storage_path"?: string | null,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_images_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_images_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_private": {
                  Row: {
                    "cost_price": number | null,"internal_notes": string | null,"product_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_price"?: number | null,"internal_notes"?: string | null,"product_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cost_price"?: number | null,"internal_notes"?: string | null,"product_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_private_product_id_fkey"
      columns: ["product_id"]
isOneToOne: true
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_private_product_id_fkey"
      columns: ["product_id"]
isOneToOne: true
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_relations": {
                  Row: {
                    "kind": Database["public"]['Enums']["relation_kind"],"product_id": string,"related_product_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "kind"?: Database["public"]['Enums']["relation_kind"],"product_id": string,"related_product_id": string,"sort_order"?: number
                  }
                  Update: {
                    "kind"?: Database["public"]['Enums']["relation_kind"],"product_id"?: string,"related_product_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_relations_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_relations_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_relations_related_product_id_fkey"
      columns: ["related_product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_relations_related_product_id_fkey"
      columns: ["related_product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "created_at": string,"id": string,"image_id": string | null,"is_active": boolean,"is_default": boolean,"lead_time_days": number | null,"name": string | null,"options": NonNullable<Json>,"price": number | null,"product_id": string,"sale_price": number | null,"sku": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"image_id"?: string | null,"is_active"?: boolean,"is_default"?: boolean,"lead_time_days"?: number | null,"name"?: string | null,"options"?: NonNullable<Json>,"price"?: number | null,"product_id": string,"sale_price"?: number | null,"sku": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"image_id"?: string | null,"is_active"?: boolean,"is_default"?: boolean,"lead_time_days"?: number | null,"name"?: string | null,"options"?: NonNullable<Json>,"price"?: number | null,"product_id"?: string,"sale_price"?: number | null,"sku"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_image_id_fkey"
      columns: ["image_id"]
isOneToOne: false
      referencedRelation: "product_images"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "brand_id": string | null,"care_instructions": string | null,"created_at": string,"delivery_days_max": number | null,"delivery_days_min": number | null,"depth_cm": number | null,"description": string | null,"handling_days": number | null,"height_cm": number | null,"id": string,"installation_instructions": string | null,"is_featured": boolean,"name": string,"noindex": boolean,"og_image_url": string | null,"package_dimensions": Json | null,"price": number,"published_at": string | null,"sale_ends_at": string | null,"sale_price": number | null,"sale_starts_at": string | null,"sales_count": number,"search_text": string,"seo_description": string | null,"seo_title": string | null,"shipping_weight_kg": number | null,"short_description": string | null,"sku": string,"slug": string,"specs": NonNullable<Json>,"status": Database["public"]['Enums']["product_status"],"updated_at": string,"video_url": string | null,"weight_kg": number | null,"width_cm": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_id"?: string | null,"care_instructions"?: string | null,"created_at"?: string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"depth_cm"?: number | null,"description"?: string | null,"handling_days"?: number | null,"height_cm"?: number | null,"id"?: string,"installation_instructions"?: string | null,"is_featured"?: boolean,"name": string,"noindex"?: boolean,"og_image_url"?: string | null,"package_dimensions"?: Json | null,"price": number,"published_at"?: string | null,"sale_ends_at"?: string | null,"sale_price"?: number | null,"sale_starts_at"?: string | null,"sales_count"?: number,"search_text"?: string,"seo_description"?: string | null,"seo_title"?: string | null,"shipping_weight_kg"?: number | null,"short_description"?: string | null,"sku": string,"slug": string,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string,"video_url"?: string | null,"weight_kg"?: number | null,"width_cm"?: number | null
                  }
                  Update: {
                    "brand_id"?: string | null,"care_instructions"?: string | null,"created_at"?: string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"depth_cm"?: number | null,"description"?: string | null,"handling_days"?: number | null,"height_cm"?: number | null,"id"?: string,"installation_instructions"?: string | null,"is_featured"?: boolean,"name"?: string,"noindex"?: boolean,"og_image_url"?: string | null,"package_dimensions"?: Json | null,"price"?: number,"published_at"?: string | null,"sale_ends_at"?: string | null,"sale_price"?: number | null,"sale_starts_at"?: string | null,"sales_count"?: number,"search_text"?: string,"seo_description"?: string | null,"seo_title"?: string | null,"shipping_weight_kg"?: number | null,"short_description"?: string | null,"sku"?: string,"slug"?: string,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string,"video_url"?: string | null,"weight_kg"?: number | null,"width_cm"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"customer_type": Database["public"]['Enums']["customer_type"],"email": string | null,"full_name": string | null,"id": string,"marketing_opt_in": boolean,"marketing_opt_in_at": string | null,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_type"?: Database["public"]['Enums']["customer_type"],"email"?: string | null,"full_name"?: string | null,"id": string,"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_type"?: Database["public"]['Enums']["customer_type"],"email"?: string | null,"full_name"?: string | null,"id"?: string,"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"promotion_rules": {
                  Row: {
                    "config": NonNullable<Json>,"id": string,"promotion_id": string,"rule_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"id"?: string,"promotion_id": string,"rule_type": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"id"?: string,"promotion_id"?: string,"rule_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "promotion_rules_promotion_id_fkey"
      columns: ["promotion_id"]
isOneToOne: false
      referencedRelation: "promotions"
      referencedColumns: ["id"]
    }
                  ]
                },"promotions": {
                  Row: {
                    "created_at": string,"ends_at": string | null,"id": string,"is_active": boolean,"kind": string,"name": string,"starts_at": string | null,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"kind": string,"name": string,"starts_at"?: string | null,"value"?: number
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"name"?: string,"starts_at"?: string | null,"value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"redirects": {
                  Row: {
                    "created_at": string,"from_path": string,"id": string,"status_code": number,"to_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_path": string,"id"?: string,"status_code"?: number,"to_path": string
                  }
                  Update: {
                    "created_at"?: string,"from_path"?: string,"id"?: string,"status_code"?: number,"to_path"?: string
                  }
                  Relationships: [
                    
                  ]
                },"refunds": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"id": string,"order_id": string,"payment_id": string | null,"provider_ref": string | null,"reason": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"order_id": string,"payment_id"?: string | null,"provider_ref"?: string | null,"reason"?: string | null,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"order_id"?: string,"payment_id"?: string | null,"provider_ref"?: string | null,"reason"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "author_name": string,"body": string | null,"created_at": string,"id": string,"is_verified": boolean,"order_id": string | null,"product_id": string | null,"rating": number,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_name": string,"body"?: string | null,"created_at"?: string,"id"?: string,"is_verified"?: boolean,"order_id"?: string | null,"product_id"?: string | null,"rating": number,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "author_name"?: string,"body"?: string | null,"created_at"?: string,"id"?: string,"is_verified"?: boolean,"order_id"?: string | null,"product_id"?: string | null,"rating"?: number,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"shipment_events": {
                  Row: {
                    "description": string | null,"id": number,"occurred_at": string,"shipment_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: never,"occurred_at"?: string,"shipment_id": string,"status": string
                  }
                  Update: {
                    "description"?: string | null,"id"?: never,"occurred_at"?: string,"shipment_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipment_events_shipment_id_fkey"
      columns: ["shipment_id"]
isOneToOne: false
      referencedRelation: "shipments"
      referencedColumns: ["id"]
    }
                  ]
                },"shipments": {
                  Row: {
                    "carrier": string | null,"created_at": string,"delivered_at": string | null,"id": string,"order_id": string,"shipped_at": string | null,"status": string,"tracking_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "carrier"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"id"?: string,"order_id": string,"shipped_at"?: string | null,"status"?: string,"tracking_number"?: string | null
                  }
                  Update: {
                    "carrier"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"id"?: string,"order_id"?: string,"shipped_at"?: string | null,"status"?: string,"tracking_number"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_methods": {
                  Row: {
                    "code": string,"created_at": string,"delivery_days_max": number | null,"delivery_days_min": number | null,"description": string | null,"free_above": number | null,"id": string,"is_active": boolean,"kind": string,"name": string,"price": number,"requires_address": boolean,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"description"?: string | null,"free_above"?: number | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"name": string,"price"?: number,"requires_address"?: boolean,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"description"?: string | null,"free_above"?: number | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"name"?: string,"price"?: number,"requires_address"?: boolean,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shipping_zones": {
                  Row: {
                    "cities": (string)[],"id": string,"is_active": boolean,"name": string,"surcharge": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cities"?: (string)[],"id"?: string,"is_active"?: boolean,"name": string,"surcharge"?: number
                  }
                  Update: {
                    "cities"?: (string)[],"id"?: string,"is_active"?: boolean,"name"?: string,"surcharge"?: number
                  }
                  Relationships: [
                    
                  ]
                },"stock_alerts": {
                  Row: {
                    "created_at": string,"id": number,"kind": string,"resolved_at": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"kind": string,"resolved_at"?: string | null,"variant_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"kind"?: string,"resolved_at"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_alerts_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_alerts_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"store_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"webhook_deliveries": {
                  Row: {
                    "attempts": number,"created_at": string,"delivered_at": string | null,"event": string,"id": number,"payload": Json | null,"response_status": number | null,"target": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"delivered_at"?: string | null,"event": string,"id"?: never,"payload"?: Json | null,"response_status"?: number | null,"target": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"delivered_at"?: string | null,"event"?: string,"id"?: never,"payload"?: Json | null,"response_status"?: number | null,"target"?: string
                  }
                  Relationships: [
                    
                  ]
                },"wishlist_items": {
                  Row: {
                    "created_at": string,"product_id": string,"wishlist_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"product_id": string,"wishlist_id": string
                  }
                  Update: {
                    "created_at"?: string,"product_id"?: string,"wishlist_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wishlist_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wishlist_items_wishlist_id_fkey"
      columns: ["wishlist_id"]
isOneToOne: false
      referencedRelation: "wishlists"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlists": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "catalog_products": {
                  Row: {
                    "brand_id": string | null,"created_at": string,"discount_percent": number | null,"hover_image_url": string | null,"id": string,"image_alt": string | null,"image_url": string | null,"in_stock": boolean | null,"is_featured": boolean,"name": string,"noindex": boolean,"price": number | null,"price_varies": boolean | null,"purchasable": boolean | null,"regular_price": number | null,"sales_count": number,"short_description": string | null,"sku": string,"slug": string,"updated_at": string,"variant_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "products_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    }
                  ]
                },"catalog_variants": {
                  Row: {
                    "allow_backorder": boolean,"available": number | null,"id": string,"image_id": string | null,"in_stock": boolean | null,"is_default": boolean,"lead_time_days": number | null,"low_stock": boolean | null,"name": string | null,"options": NonNullable<Json>,"price": number | null,"product_id": string,"regular_price": number | null,"sku": string,"sort_order": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "product_variants_image_id_fkey"
      columns: ["image_id"]
isOneToOne: false
      referencedRelation: "product_images"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "catalog_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "_cancel_pending_order":
{ Args: { "p_order_id": string,"p_payment_status": Database["public"]['Enums']["payment_status"],"p_reason": string }; Returns: boolean
                           },
"_release_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"admin_set_order_status":
{ Args: { "p_order_id": string,"p_status": Database["public"]['Enums']["order_status"],"p_tracking"?: string }; Returns: {
              "cancel_reason": string | null,
"cart_id": string | null,
"company_name": string | null,
"company_number": string | null,
"coupon_code": string | null,
"created_at": string,
"currency": string,
"customer_email": string,
"customer_name": string,
"customer_note": string | null,
"customer_phone": string,
"customer_type": Database["public"]['Enums']["customer_type"],
"discount_total": number,
"id": string,
"order_number": number,
"paid_at": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"placed_at": string,
"public_token": string,
"reservation_expires_at": string | null,
"shipping_method_id": string | null,
"shipping_method_name": string,
"shipping_total": number,
"status": Database["public"]['Enums']["order_status"],
"subtotal": number,
"total": number,
"tracking_number": string | null,
"updated_at": string,
"user_id": string | null,
"vat_amount": number,
"vat_rate": number
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"admin_set_stock":
{ Args: { "p_note"?: string,"p_on_hand": number,"p_variant_id": string }; Returns: {
              "allow_backorder": boolean,
"low_stock_threshold": number,
"on_hand": number,
"reserved": number,
"updated_at": string,
"variant_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "inventory"
        isOneToOne: true
        isSetofReturn: false
      } },
"cart_summary":
{ Args: { "p_cart_id": string,"p_shipping_method_id"?: string }; Returns: Json
                           },
"catalog_base":
{ Args: { "p_category_id": string,"p_collection_id": string,"p_q": string }; Returns: {
              "brand_id": string | null,
"created_at": string,
"discount_percent": number | null,
"hover_image_url": string | null,
"id": string,
"image_alt": string | null,
"image_url": string | null,
"in_stock": boolean | null,
"is_featured": boolean,
"name": string,
"noindex": boolean,
"price": number | null,
"price_varies": boolean | null,
"purchasable": boolean | null,
"regular_price": number | null,
"sales_count": number,
"short_description": string | null,
"sku": string,
"slug": string,
"updated_at": string,
"variant_count": number | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "catalog_products"
        isOneToOne: false
        isSetofReturn: true
      } },
"catalog_facets":
{ Args: { "p_category_id"?: string,"p_collection_id"?: string,"p_q"?: string }; Returns: Json
                           },
"catalog_search":
{ Args: { "p_category_id"?: string,"p_collection_id"?: string,"p_in_stock"?: boolean,"p_limit"?: number,"p_max_price"?: number,"p_min_price"?: number,"p_offset"?: number,"p_on_sale"?: boolean,"p_q"?: string,"p_sort"?: string,"p_value_ids"?: (string)[] }; Returns: Json
                           },
"category_tree":
{ Args: { "p_category_id": string }; Returns: string[]
                           },
"confirm_order_payment":
{ Args: { "p_amount": number,"p_order_id": string,"p_provider": string,"p_provider_ref": string,"p_raw"?: Json }; Returns: Json
                           },
"create_order":
{ Args: { "p_address": Json,"p_cart_id": string,"p_customer": Json,"p_note"?: string,"p_shipping_method_id": string,"p_user_id"?: string }; Returns: Json
                           },
"fail_order_payment":
{ Args: { "p_order_id": string,"p_provider": string,"p_reason"?: string }; Returns: boolean
                           },
"has_permission":
{ Args: { "p_permission": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"my_permissions":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"refresh_product_search":
{ Args: { "p_product_id": string }; Returns: undefined
                           },
"register_payment_event":
{ Args: { "p_event_id": string,"p_order_id": string,"p_payload": Json,"p_provider": string,"p_type": string }; Returns: boolean
                           },
"release_expired_orders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"store_setting":
{ Args: { "p_key": string }; Returns: Json
                           }
          }
          Enums: {
            "customer_type": "private"|"business","order_status": "pending_payment"|"paid"|"processing"|"preparing"|"ready_to_ship"|"shipped"|"delivered"|"cancelled"|"returned","payment_status": "unpaid"|"pending"|"paid"|"failed"|"refunded"|"partially_refunded","product_status": "draft"|"active"|"archived","relation_kind": "related"|"complementary"|"upsell"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "customer_type": ["private", "business"],"order_status": ["pending_payment", "paid", "processing", "preparing", "ready_to_ship", "shipped", "delivered", "cancelled", "returned"],"payment_status": ["unpaid", "pending", "paid", "failed", "refunded", "partially_refunded"],"product_status": ["draft", "active", "archived"],"relation_kind": ["related", "complementary", "upsell"]
          }
        }
} as const
