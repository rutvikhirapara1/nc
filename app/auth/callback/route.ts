import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';

export async function GET(request:Request){
  const {searchParams,origin}=new URL(request.url);
  const code=searchParams.get('code');

  if(!code){
    return NextResponse.redirect(new URL('/login?error=verification_failed',origin));
  }

  const cookieStore=await cookies();
  const supabase=createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies:{
        getAll(){return cookieStore.getAll();},
        setAll(cookiesToSet){
          cookiesToSet.forEach(({name,value,options})=>cookieStore.set(name,value,options));
        },
      },
    },
  );

  const {error}=await supabase.auth.exchangeCodeForSession(code);

  if(error){
    console.error('Email verification callback failed:',error);
    return NextResponse.redirect(new URL('/login?error=verification_failed',origin));
  }

  return NextResponse.redirect(new URL('/dashboard',origin));
}