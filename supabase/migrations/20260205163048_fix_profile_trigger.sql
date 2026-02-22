-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen_username TEXT;
BEGIN
  -- Read username from user metadata, fallback to temp_<uid> if not provided
  chosen_username := COALESCE(
    LOWER(TRIM(NEW.raw_user_meta_data->>'username')),
    'temp_' || NEW.id::text
  );
  
  INSERT INTO public.profiles (id, user_id, username)
  VALUES (NEW.id, NEW.id, chosen_username)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policy for profiles UPDATE to include WITH CHECK clause
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
