
--
-- Name: get_comment_depth(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_comment_depth(comment_id integer, table_name text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_id_val INTEGER;
  parent_depth INTEGER;
BEGIN
  IF table_name = 'product_reviews' THEN
    SELECT parent_id INTO parent_id_val FROM product_reviews WHERE id = comment_id;
    IF parent_id_val IS NULL THEN
      RETURN 0;
    ELSE
      SELECT depth INTO parent_depth FROM product_reviews WHERE id = parent_id_val;
      RETURN COALESCE(parent_depth, 0) + 1;
    END IF;
  ELSIF table_name = 'service_reviews' THEN
    SELECT parent_id INTO parent_id_val FROM service_reviews WHERE id = comment_id;
    IF parent_id_val IS NULL THEN
      RETURN 0;
    ELSE
      SELECT depth INTO parent_depth FROM service_reviews WHERE id = parent_id_val;
      RETURN COALESCE(parent_depth, 0) + 1;
    END IF;
  END IF;
  RETURN 0;
END;
$$;


--
-- Name: log_price_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_price_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO product_price_history (product_id, old_price, new_price, changed_by)
        VALUES (OLD.id, OLD.price, NEW.price, NEW.student_id);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: prevent_negative_quantity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_negative_quantity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.quantity < 0 THEN
        RAISE EXCEPTION 'Product quantity cannot be negative';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: set_thread_root_for_toplevel_products(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_thread_root_for_toplevel_products() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE product_reviews SET thread_root_id = NEW.id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_thread_root_for_toplevel_services(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_thread_root_for_toplevel_services() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE service_reviews
    SET thread_root_id = NEW.id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_announcements_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_announcements_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_deliveries_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_deliveries_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_order_status_on_delivery_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_order_status_on_delivery_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only update when status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE orders SET status = 'delivered' WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_orders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_orders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_product_reviews_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_reviews_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_provider_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_provider_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  provider_id_to_update VARCHAR(20);
BEGIN
  -- Determine which provider to update
  IF TG_OP = 'DELETE' THEN
    provider_id_to_update := OLD.provider_id;
  ELSE
    provider_id_to_update := NEW.provider_id;
  END IF;

  -- Only update for top-level reviews (parent_id IS NULL)
  IF (TG_OP = 'DELETE' AND OLD.parent_id IS NULL) OR 
     (TG_OP IN ('INSERT', 'UPDATE') AND NEW.parent_id IS NULL) THEN
    
    UPDATE students
    SET 
      service_provider_rating = (
        SELECT COALESCE(AVG(rating), 5.0)
        FROM service_reviews
        WHERE provider_id = provider_id_to_update 
        AND parent_id IS NULL
        AND rating IS NOT NULL
      ),
      service_review_count = (
        SELECT COUNT(*)
        FROM service_reviews
        WHERE provider_id = provider_id_to_update 
        AND parent_id IS NULL
      )
    WHERE student_id = provider_id_to_update;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_service_bookings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_service_bookings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_service_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_service_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  service_id_to_update INTEGER;
BEGIN
  -- Determine which service to update
  IF TG_OP = 'DELETE' THEN
    service_id_to_update := OLD.service_id;
  ELSE
    service_id_to_update := NEW.service_id;
  END IF;

  -- Only update for top-level reviews (parent_id IS NULL)
  IF (TG_OP = 'DELETE' AND OLD.parent_id IS NULL) OR 
     (TG_OP IN ('INSERT', 'UPDATE') AND NEW.parent_id IS NULL) THEN
    
    UPDATE services
    SET 
      rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM service_reviews
        WHERE service_id = service_id_to_update 
        AND parent_id IS NULL
        AND rating IS NOT NULL
      ),
      review_count = (
        SELECT COUNT(*)
        FROM service_reviews
        WHERE service_id = service_id_to_update 
        AND parent_id IS NULL
      )
    WHERE id = service_id_to_update;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_services_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_services_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: validate_and_set_comment_depth_products(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_and_set_comment_depth_products() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_depth INTEGER;
  parent_root_id INTEGER;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent's depth
    SELECT depth INTO parent_depth FROM product_reviews WHERE id = NEW.parent_id;
    
    -- Check max depth (3 levels: 0, 1, 2 where 2 is max)
    IF COALESCE(parent_depth, 0) >= 2 THEN
      RAISE EXCEPTION 'Cannot nest comments more than 3 levels deep';
    END IF;
    
    -- Set new comment's depth
    NEW.depth = COALESCE(parent_depth, 0) + 1;
    
    -- Set thread_root_id
    SELECT thread_root_id INTO parent_root_id FROM product_reviews WHERE id = NEW.parent_id;
    NEW.thread_root_id = COALESCE(parent_root_id, NEW.parent_id);
  ELSE
    -- Top-level comment
    NEW.depth = 0;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: validate_and_set_comment_depth_services(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_and_set_comment_depth_services() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_depth INTEGER;
  parent_root_id INTEGER;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent's depth
    SELECT depth INTO parent_depth FROM service_reviews WHERE id = NEW.parent_id;

    -- Enforce max depth of 3 levels (0, 1, 2)
    IF COALESCE(parent_depth, 0) >= 2 THEN
      RAISE EXCEPTION 'Cannot nest comments more than 3 levels deep';
    END IF;

    -- Set depth
    NEW.depth = COALESCE(parent_depth, 0) + 1;

    -- Set thread_root_id (root of the thread)
    SELECT thread_root_id INTO parent_root_id FROM service_reviews WHERE id = NEW.parent_id;
    NEW.thread_root_id = COALESCE(parent_root_id, NEW.parent_id);

  ELSE
    -- Top-level comment
    NEW.depth = 0;
  END IF;

  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_by character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image_url text
);


--
-- Name: COLUMN announcements.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.image_url IS 'Optional URL of the announcement image stored in ImageKit';


--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: cart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart (
    id integer NOT NULL,
    student_id character varying(20),
    product_id integer,
    quantity integer DEFAULT 1,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cart_quantity_check CHECK ((quantity > 0))
);


--
-- Name: cart_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_id_seq OWNED BY public.cart.id;


--
-- Name: delete_account_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delete_account_requests (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    student_id_or_email character varying(255) NOT NULL,
    deletion_message text NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT delete_account_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: delete_account_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delete_account_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delete_account_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delete_account_requests_id_seq OWNED BY public.delete_account_requests.id;


--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliveries (
    id integer NOT NULL,
    order_id integer,
    customer_id character varying(20),
    seller_id character varying(20),
    delivery_person_id character varying(20),
    pickup_hall_id integer,
    pickup_room_number character varying(20),
    delivery_hall_id integer,
    delivery_room_number character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying,
    delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    assigned_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    rating integer,
    review text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deliveries_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT deliveries_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: deliveries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deliveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deliveries_id_seq OWNED BY public.deliveries.id;


--
-- Name: delivery_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_codes (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    is_used boolean DEFAULT false,
    used_by_student_id character varying(20) DEFAULT NULL::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    used_at timestamp without time zone,
    expires_at timestamp without time zone
);


--
-- Name: delivery_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_codes_id_seq OWNED BY public.delivery_codes.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id character varying(20),
    seller_id character varying(20),
    product_id integer,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    delivery_option character varying(20) NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    delivery_hall_id integer,
    delivery_room_number character varying(20),
    special_instructions text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_delivery_option_check CHECK (((delivery_option)::text = ANY ((ARRAY['pickup'::character varying, 'delivery'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['confirmed'::character varying, 'processing'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: product_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_favorites (
    id integer NOT NULL,
    product_id integer,
    student_id character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_favorites_id_seq OWNED BY public.product_favorites.id;


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id integer NOT NULL,
    product_id integer,
    image_url text NOT NULL,
    thumbnail_url text,
    is_primary boolean DEFAULT false,
    upload_order integer DEFAULT 0,
    file_size integer,
    storage_path text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_images_id_seq OWNED BY public.product_images.id;


--
-- Name: product_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_price_history (
    id integer NOT NULL,
    product_id integer,
    old_price numeric(10,2),
    new_price numeric(10,2),
    changed_by character varying(20),
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_price_history_id_seq OWNED BY public.product_price_history.id;


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id integer NOT NULL,
    product_id integer,
    student_id character varying(20),
    rating integer,
    title character varying(255),
    comment text NOT NULL,
    order_id integer,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer,
    depth integer DEFAULT 0,
    thread_root_id integer,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 0) AND (rating <= 5)))
);


--
-- Name: COLUMN product_reviews.depth; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_reviews.depth IS 'Nesting level: 0=top-level review, 1-2=nested comments. Max depth is 2 (3 levels total).';


--
-- Name: COLUMN product_reviews.thread_root_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_reviews.thread_root_id IS 'ID of the root review in this thread. Used for grouping related comments.';


--
-- Name: product_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_reviews_id_seq OWNED BY public.product_reviews.id;


--
-- Name: product_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_views (
    id integer NOT NULL,
    product_id integer,
    student_id character varying(20),
    viewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45)
);


--
-- Name: product_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_views_id_seq OWNED BY public.product_views.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    student_id character varying(20),
    title character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    description text NOT NULL,
    category character varying(50) NOT NULL,
    condition character varying(20) DEFAULT 'Good'::character varying NOT NULL,
    contact_method character varying(20) NOT NULL,
    hall_id integer,
    room_number character varying(20),
    status character varying(20) DEFAULT 'draft'::character varying,
    is_approved boolean DEFAULT false,
    view_count integer DEFAULT 0,
    price_negotiable boolean DEFAULT false,
    tags text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_bumped_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    quantity integer DEFAULT 1,
    CONSTRAINT products_category_check CHECK (((category)::text = ANY ((ARRAY['Books'::character varying, 'Electronics'::character varying, 'Fashion'::character varying, 'Hostel Items'::character varying, 'Food'::character varying, 'Other'::character varying])::text[]))),
    CONSTRAINT products_condition_check CHECK (((condition)::text = ANY ((ARRAY['New'::character varying, 'Used'::character varying, 'Like New'::character varying, 'Good'::character varying, 'Fair'::character varying])::text[]))),
    CONSTRAINT products_contact_method_check CHECK (((contact_method)::text = ANY ((ARRAY['WhatsApp'::character varying, 'Call'::character varying, 'SMS'::character varying, 'in_app'::character varying])::text[]))),
    CONSTRAINT products_price_check CHECK (((price >= (0)::numeric) AND (price <= (10000)::numeric))),
    CONSTRAINT products_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'available'::character varying, 'reserved'::character varying, 'sold'::character varying, 'archived'::character varying, 'pending'::character varying])::text[])))
);


--
-- Name: COLUMN products.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.quantity IS 'Stock quantity available for sale. Must be >= 0. Defaults to 1.';


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: service_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_bookings (
    id integer NOT NULL,
    service_id integer,
    customer_id character varying(20),
    provider_id character varying(20),
    booking_date date,
    booking_time time without time zone,
    duration integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    price numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE service_bookings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.service_bookings IS 'Service bookings table - booking_date, booking_time, and duration are now optional for simplified booking requests';


--
-- Name: service_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_bookings_id_seq OWNED BY public.service_bookings.id;


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    icon character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: service_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;


--
-- Name: service_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_images (
    id integer NOT NULL,
    service_id integer,
    image_url text NOT NULL,
    thumbnail_url text,
    is_primary boolean DEFAULT false,
    upload_order integer DEFAULT 0,
    file_size integer,
    storage_path text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: service_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_images_id_seq OWNED BY public.service_images.id;


--
-- Name: service_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_notifications (
    id integer NOT NULL,
    student_id character varying(20),
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_notifications_type_check CHECK (((type)::text = ANY ((ARRAY['booking_request'::character varying, 'booking_confirmed'::character varying, 'booking_cancelled'::character varying, 'reminder'::character varying, 'payment_received'::character varying])::text[])))
);


--
-- Name: service_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_notifications_id_seq OWNED BY public.service_notifications.id;


--
-- Name: service_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_reviews (
    id integer NOT NULL,
    service_id integer,
    booking_id integer,
    customer_id character varying(20),
    provider_id character varying(20),
    rating integer NOT NULL,
    title character varying(255),
    comment text,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    depth integer DEFAULT 0,
    thread_root_id integer,
    parent_id integer,
    CONSTRAINT service_reviews_rating_check CHECK ((((parent_id IS NULL) AND ((rating >= 1) AND (rating <= 5))) OR ((parent_id IS NOT NULL) AND ((rating IS NULL) OR (rating = 0)))))
);


--
-- Name: COLUMN service_reviews.depth; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_reviews.depth IS 'Nesting level: 0=top-level review, 1-2=nested comments. Max depth is 2 (3 levels total).';


--
-- Name: COLUMN service_reviews.thread_root_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_reviews.thread_root_id IS 'ID of the root review in this thread. Used for grouping related comments.';


--
-- Name: CONSTRAINT service_reviews_rating_check ON service_reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT service_reviews_rating_check ON public.service_reviews IS 'Top-level reviews must have rating 1-5, nested replies should have NULL rating';


--
-- Name: service_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_reviews_id_seq OWNED BY public.service_reviews.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    student_id character varying(20),
    title character varying(255) NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    category character varying(50) NOT NULL,
    contact_method character varying(20) NOT NULL,
    hall_id integer,
    room_number character varying(20),
    status character varying(20) DEFAULT 'draft'::character varying,
    is_approved boolean DEFAULT false,
    view_count integer DEFAULT 0,
    price_negotiable boolean DEFAULT false,
    tags text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_bumped_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    availability_schedule jsonb,
    image_urls text[],
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    CONSTRAINT services_category_check CHECK (((category)::text = ANY ((ARRAY['Tutoring'::character varying, 'Laundry & Cleaning'::character varying, 'Cooking & Meal Prep'::character varying, 'IT & Tech Support'::character varying, 'Graphic Design'::character varying, 'Other'::character varying])::text[]))),
    CONSTRAINT services_contact_method_check CHECK (((contact_method)::text = ANY ((ARRAY['WhatsApp'::character varying, 'Call'::character varying, 'SMS'::character varying, 'in_app'::character varying])::text[]))),
    CONSTRAINT services_price_check CHECK (((price >= (0)::numeric) AND (price <= (10000)::numeric))),
    CONSTRAINT services_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'available'::character varying, 'reserved'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: COLUMN services.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.services.rating IS 'Average rating from service reviews (calculated from top-level reviews only)';


--
-- Name: COLUMN services.review_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.services.review_count IS 'Total count of top-level reviews (excludes nested replies)';


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    student_id character varying(20) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(20),
    gender character varying(10),
    hall_of_residence text,
    date_of_birth date,
    profile_picture text,
    id_card text,
    password text,
    is_verified boolean DEFAULT false,
    verification_token character varying(255),
    role character varying(20) DEFAULT 'buyer_seller'::character varying,
    delivery_code character varying(20) DEFAULT NULL::character varying,
    is_delivery_approved boolean DEFAULT false,
    university character varying(255) DEFAULT NULL::character varying,
    program character varying(255) DEFAULT NULL::character varying,
    graduation_year integer,
    rating numeric(3,2) DEFAULT 5.0,
    total_ratings integer DEFAULT 0,
    room_number character varying(20),
    is_active_seller boolean DEFAULT false,
    is_active_service_provider boolean DEFAULT false,
    seller_rating numeric(3,2) DEFAULT 5.0,
    seller_review_count integer DEFAULT 0,
    service_provider_rating numeric(3,2) DEFAULT 5.0,
    service_review_count integer DEFAULT 0,
    delivery_rating numeric(3,2) DEFAULT 5.0,
    delivery_review_count integer DEFAULT 0,
    total_transactions integer DEFAULT 0,
    last_active timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    profile_completion_score integer DEFAULT 0,
    preferred_contact_method character varying(20) DEFAULT 'in_app'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    registration_complete boolean DEFAULT false,
    has_paid boolean DEFAULT false,
    payment_date timestamp without time zone,
    CONSTRAINT chk_payment_date CHECK ((((has_paid = false) AND (payment_date IS NULL)) OR ((has_paid = true) AND (payment_date IS NOT NULL))))
);


--
-- Name: COLUMN students.registration_complete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.registration_complete IS 'Indicates if student registration is fully complete (Step 1 + Step 2)';


--
-- Name: COLUMN students.has_paid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.has_paid IS 'Indicates if student has paid the GH₵5.00 registration fee';


--
-- Name: COLUMN students.payment_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.payment_date IS 'Timestamp when payment was completed';


--
-- Name: university_halls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.university_halls (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    short_name character varying(20),
    description text,
    location_zone character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: university_halls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.university_halls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: university_halls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.university_halls_id_seq OWNED BY public.university_halls.id;


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: cart id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart ALTER COLUMN id SET DEFAULT nextval('public.cart_id_seq'::regclass);


--
-- Name: delete_account_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delete_account_requests ALTER COLUMN id SET DEFAULT nextval('public.delete_account_requests_id_seq'::regclass);


--
-- Name: deliveries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries ALTER COLUMN id SET DEFAULT nextval('public.deliveries_id_seq'::regclass);


--
-- Name: delivery_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_codes ALTER COLUMN id SET DEFAULT nextval('public.delivery_codes_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: product_favorites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_favorites ALTER COLUMN id SET DEFAULT nextval('public.product_favorites_id_seq'::regclass);


--
-- Name: product_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images ALTER COLUMN id SET DEFAULT nextval('public.product_images_id_seq'::regclass);


--
-- Name: product_price_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history ALTER COLUMN id SET DEFAULT nextval('public.product_price_history_id_seq'::regclass);


--
-- Name: product_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews ALTER COLUMN id SET DEFAULT nextval('public.product_reviews_id_seq'::regclass);


--
-- Name: product_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views ALTER COLUMN id SET DEFAULT nextval('public.product_views_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: service_bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings ALTER COLUMN id SET DEFAULT nextval('public.service_bookings_id_seq'::regclass);


--
-- Name: service_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);


--
-- Name: service_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_images ALTER COLUMN id SET DEFAULT nextval('public.service_images_id_seq'::regclass);


--
-- Name: service_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_notifications ALTER COLUMN id SET DEFAULT nextval('public.service_notifications_id_seq'::regclass);


--
-- Name: service_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reviews ALTER COLUMN id SET DEFAULT nextval('public.service_reviews_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: university_halls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.university_halls ALTER COLUMN id SET DEFAULT nextval('public.university_halls_id_seq'::regclass);




--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (id);


--
-- Name: cart cart_student_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_student_id_product_id_key UNIQUE (student_id, product_id);


--
-- Name: delete_account_requests delete_account_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delete_account_requests
    ADD CONSTRAINT delete_account_requests_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: delivery_codes delivery_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_codes
    ADD CONSTRAINT delivery_codes_code_key UNIQUE (code);


--
-- Name: delivery_codes delivery_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_codes
    ADD CONSTRAINT delivery_codes_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_favorites product_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_favorites
    ADD CONSTRAINT product_favorites_pkey PRIMARY KEY (id);


--
-- Name: product_favorites product_favorites_product_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_favorites
    ADD CONSTRAINT product_favorites_product_id_student_id_key UNIQUE (product_id, student_id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_price_history product_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_views product_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: service_bookings service_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_name_key UNIQUE (name);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: service_images service_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_images
    ADD CONSTRAINT service_images_pkey PRIMARY KEY (id);


--
-- Name: service_notifications service_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_notifications
    ADD CONSTRAINT service_notifications_pkey PRIMARY KEY (id);


--
-- Name: service_reviews service_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reviews
    ADD CONSTRAINT service_reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: students students_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_email_key UNIQUE (email);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- Name: university_halls university_halls_full_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.university_halls
    ADD CONSTRAINT university_halls_full_name_key UNIQUE (full_name);


--
-- Name: university_halls university_halls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.university_halls
    ADD CONSTRAINT university_halls_pkey PRIMARY KEY (id);


--
-- Name: users_sync_deleted_at_idx; Type: INDEX; Schema: neon_auth; Owner: -
--



--
-- Name: idx_announcements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_created_at ON public.announcements USING btree (created_at);


--
-- Name: idx_announcements_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_created_by ON public.announcements USING btree (created_by);


--
-- Name: idx_cart_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_product_id ON public.cart USING btree (product_id);


--
-- Name: idx_cart_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_student_id ON public.cart USING btree (student_id);


--
-- Name: idx_delete_account_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delete_account_requests_status ON public.delete_account_requests USING btree (status);


--
-- Name: idx_delete_account_requests_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delete_account_requests_submitted_at ON public.delete_account_requests USING btree (submitted_at DESC);


--
-- Name: idx_deliveries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_created_at ON public.deliveries USING btree (created_at);


--
-- Name: idx_deliveries_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_customer_id ON public.deliveries USING btree (customer_id);


--
-- Name: idx_deliveries_delivery_person_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_delivery_person_id ON public.deliveries USING btree (delivery_person_id);


--
-- Name: idx_deliveries_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_order_id ON public.deliveries USING btree (order_id);


--
-- Name: idx_deliveries_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_seller_id ON public.deliveries USING btree (seller_id);


--
-- Name: idx_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_status ON public.deliveries USING btree (status);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_delivery_option; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_delivery_option ON public.orders USING btree (delivery_option);


--
-- Name: idx_orders_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_product_id ON public.orders USING btree (product_id);


--
-- Name: idx_orders_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_seller_id ON public.orders USING btree (seller_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_product_favorites_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_favorites_product_id ON public.product_favorites USING btree (product_id);


--
-- Name: idx_product_favorites_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_favorites_student_id ON public.product_favorites USING btree (student_id);


--
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);


--
-- Name: idx_product_reviews_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_created_at ON public.product_reviews USING btree (created_at);


--
-- Name: idx_product_reviews_depth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_depth ON public.product_reviews USING btree (depth);


--
-- Name: idx_product_reviews_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_parent_id ON public.product_reviews USING btree (parent_id);


--
-- Name: idx_product_reviews_parent_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_parent_product ON public.product_reviews USING btree (parent_id, product_id);


--
-- Name: idx_product_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_product_id ON public.product_reviews USING btree (product_id);


--
-- Name: idx_product_reviews_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_rating ON public.product_reviews USING btree (rating);


--
-- Name: idx_product_reviews_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_student_id ON public.product_reviews USING btree (student_id);


--
-- Name: idx_product_reviews_thread_root; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_thread_root ON public.product_reviews USING btree (thread_root_id);


--
-- Name: idx_product_reviews_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_updated_at ON public.product_reviews USING btree (updated_at);


--
-- Name: idx_product_views_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_product_id ON public.product_views USING btree (product_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at);


--
-- Name: idx_products_hall_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_hall_id ON public.products USING btree (hall_id);


--
-- Name: idx_products_last_bumped; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_last_bumped ON public.products USING btree (last_bumped_at);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_price ON public.products USING btree (price);


--
-- Name: idx_products_quantity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_quantity ON public.products USING btree (quantity);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_products_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_student_id ON public.products USING btree (student_id);


--
-- Name: idx_products_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_tags ON public.products USING gin (tags);


--
-- Name: idx_service_bookings_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_customer_id ON public.service_bookings USING btree (customer_id);


--
-- Name: idx_service_bookings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_date ON public.service_bookings USING btree (booking_date);


--
-- Name: idx_service_bookings_provider_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_provider_id ON public.service_bookings USING btree (provider_id);


--
-- Name: idx_service_bookings_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_service_id ON public.service_bookings USING btree (service_id);


--
-- Name: idx_service_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bookings_status ON public.service_bookings USING btree (status);


--
-- Name: idx_service_images_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_images_service_id ON public.service_images USING btree (service_id);


--
-- Name: idx_service_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_notifications_created_at ON public.service_notifications USING btree (created_at);


--
-- Name: idx_service_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_notifications_is_read ON public.service_notifications USING btree (is_read);


--
-- Name: idx_service_notifications_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_notifications_student_id ON public.service_notifications USING btree (student_id);


--
-- Name: idx_service_reviews_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_customer_id ON public.service_reviews USING btree (customer_id);


--
-- Name: idx_service_reviews_depth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_depth ON public.service_reviews USING btree (depth);


--
-- Name: idx_service_reviews_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_parent_id ON public.service_reviews USING btree (parent_id);


--
-- Name: idx_service_reviews_provider_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_provider_id ON public.service_reviews USING btree (provider_id);


--
-- Name: idx_service_reviews_provider_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_provider_parent ON public.service_reviews USING btree (provider_id, parent_id);


--
-- Name: idx_service_reviews_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_service_id ON public.service_reviews USING btree (service_id);


--
-- Name: idx_service_reviews_service_parent_depth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_service_parent_depth ON public.service_reviews USING btree (service_id, parent_id, depth, created_at DESC);


--
-- Name: idx_service_reviews_thread_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_thread_created ON public.service_reviews USING btree (thread_root_id, created_at DESC);


--
-- Name: idx_service_reviews_thread_root; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_reviews_thread_root ON public.service_reviews USING btree (thread_root_id);


--
-- Name: idx_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_category ON public.services USING btree (category);


--
-- Name: idx_services_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_created_at ON public.services USING btree (created_at);


--
-- Name: idx_services_hall_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_hall_id ON public.services USING btree (hall_id);


--
-- Name: idx_services_last_bumped; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_last_bumped ON public.services USING btree (last_bumped_at);


--
-- Name: idx_services_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_price ON public.services USING btree (price);


--
-- Name: idx_services_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_rating ON public.services USING btree (rating);


--
-- Name: idx_services_review_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_review_count ON public.services USING btree (review_count);


--
-- Name: idx_services_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_status ON public.services USING btree (status);


--
-- Name: idx_services_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_student_id ON public.services USING btree (student_id);


--
-- Name: idx_services_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_tags ON public.services USING gin (tags);


--
-- Name: idx_students_has_paid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_has_paid ON public.students USING btree (has_paid);


--
-- Name: products track_product_price_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_product_price_changes AFTER UPDATE OF price ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_price_change();


--
-- Name: products trigger_prevent_negative_quantity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_prevent_negative_quantity BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.prevent_negative_quantity();


--
-- Name: product_reviews trigger_set_thread_root_products; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_thread_root_products AFTER INSERT ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.set_thread_root_for_toplevel_products();


--
-- Name: service_reviews trigger_set_thread_root_services; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_thread_root_services AFTER INSERT ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION public.set_thread_root_for_toplevel_services();


--
-- Name: deliveries trigger_update_order_status_on_delivery_completion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_order_status_on_delivery_completion AFTER UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_order_status_on_delivery_completion();


--
-- Name: service_reviews trigger_update_provider_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_provider_rating AFTER INSERT OR DELETE OR UPDATE ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION public.update_provider_rating();


--
-- Name: TRIGGER trigger_update_provider_rating ON service_reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_update_provider_rating ON public.service_reviews IS 'Automatically updates provider service_provider_rating and service_review_count when reviews are added, updated, or deleted';


--
-- Name: service_reviews trigger_update_service_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_service_rating AFTER INSERT OR DELETE OR UPDATE ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION public.update_service_rating();


--
-- Name: TRIGGER trigger_update_service_rating ON service_reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_update_service_rating ON public.service_reviews IS 'Automatically updates service rating and review_count when reviews are added, updated, or deleted';


--
-- Name: product_reviews trigger_validate_comment_depth_products; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_comment_depth_products BEFORE INSERT ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_and_set_comment_depth_products();


--
-- Name: service_reviews trigger_validate_comment_depth_services; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_comment_depth_services BEFORE INSERT ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_and_set_comment_depth_services();


--
-- Name: announcements update_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_announcements_updated_at();


--
-- Name: deliveries update_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_deliveries_updated_at();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();


--
-- Name: product_reviews update_product_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_product_reviews_updated_at();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: service_bookings update_service_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_service_bookings_updated_at BEFORE UPDATE ON public.service_bookings FOR EACH ROW EXECUTE FUNCTION public.update_service_bookings_updated_at();


--
-- Name: services update_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_services_updated_at();


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.students(student_id) ON DELETE SET NULL;


--
-- Name: cart cart_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart cart_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_delivery_hall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_delivery_hall_id_fkey FOREIGN KEY (delivery_hall_id) REFERENCES public.university_halls(id) ON DELETE SET NULL;


--
-- Name: deliveries deliveries_delivery_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_delivery_person_id_fkey FOREIGN KEY (delivery_person_id) REFERENCES public.students(student_id) ON DELETE SET NULL;


--
-- Name: deliveries deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_pickup_hall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pickup_hall_id_fkey FOREIGN KEY (pickup_hall_id) REFERENCES public.university_halls(id) ON DELETE SET NULL;


--
-- Name: deliveries deliveries_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: orders orders_delivery_hall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_hall_id_fkey FOREIGN KEY (delivery_hall_id) REFERENCES public.university_halls(id) ON DELETE SET NULL;


--
-- Name: orders orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: orders orders_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: product_favorites product_favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_favorites
    ADD CONSTRAINT product_favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_favorites product_favorites_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_favorites
    ADD CONSTRAINT product_favorites_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_price_history product_price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.students(student_id) ON DELETE SET NULL;


--
-- Name: product_price_history product_price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_reviews(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: product_views product_views_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_views product_views_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE SET NULL;


--
-- Name: products products_hall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_hall_id_fkey FOREIGN KEY (hall_id) REFERENCES public.university_halls(id) ON DELETE SET NULL;


--
-- Name: products products_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: service_bookings service_bookings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: service_bookings service_bookings_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: service_bookings service_bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: service_images service_images_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_images
    ADD CONSTRAINT service_images_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: service_notifications service_notifications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_notifications
    ADD CONSTRAINT service_notifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: service_reviews service_reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reviews
    ADD CONSTRAINT service_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.service_bookings(id) ON DELETE CASCADE;


--
-- Name: service_reviews service_reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reviews
    ADD CONSTRAINT service_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: service_reviews service_reviews_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reviews
    ADD CONSTRAINT service_reviews_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.service_reviews(id) ON DELETE CASCADE;


--
-- Name: service_reviews service_reviews_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reviews
    ADD CONSTRAINT service_reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: service_reviews service_reviews_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reviews
    ADD CONSTRAINT service_reviews_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: services services_hall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_hall_id_fkey FOREIGN KEY (hall_id) REFERENCES public.university_halls(id) ON DELETE SET NULL;


--
-- Name: services services_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


