-- Only seed admin role if the referenced user actually exists in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT '44c2f3c5-b84d-435c-8565-7b51407d99ac', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '44c2f3c5-b84d-435c-8565-7b51407d99ac')
ON CONFLICT DO NOTHING;