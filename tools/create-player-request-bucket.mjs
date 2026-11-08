// Run once with the existing server-side environment, never in a public client.
import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key) throw new Error('Server-side Supabase configuration is required');
const storage=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
const name='player-requests';
const {data:existing}=await storage.getBucket(name);
if(!existing) {
 const {error}=await storage.createBucket(name,{public:false,fileSizeLimit:8192,allowedMimeTypes:['application/json']});
 if(error) throw new Error('Could not create the private player-request inbox');
} else if(existing.public) throw new Error('Refusing to use a public player-request bucket');
const {data,error}=await storage.getBucket(name);
if(error || !data || data.public) throw new Error('Private inbox verification failed');
console.log(JSON.stringify({id:data.id,public:data.public,fileSizeLimit:data.file_size_limit,allowedMimeTypes:data.allowed_mime_types}));
