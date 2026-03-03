
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, LogIn, User } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, type UserCredential, signInAnonymously } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";

// PKCE Helper Functions
function dec2hex(dec: number): string {
  return ('0' + dec.toString(16)).slice(-2);
}

function generateRandomString(len: number): string {
  const arr = new Uint8Array((len || 40) / 2);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(arr);
  } else {
    // Fallback for environments where window.crypto is not available (e.g., older Node.js versions for server-side rendering if used there)
    // This should ideally not be hit in a client-side context for PKCE.
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr, dec2hex).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle.digest('SHA-256', data);
  }
  throw new Error("Web Crypto API not available. Please use a modern browser.");
}

function base64urlencode(a: ArrayBuffer): string {
  let str = "";
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const LICHESS_CLIENT_ID = process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID;
const LICHESS_SCOPES = "preference:read game:read";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [lichessRedirectUri, setLichessRedirectUri] = useState('');
  // Set to true to pause URL cleanup for Lichess callback debugging, set to false for normal operation
  const [debugLichessCallback] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      const redirectUri = `${currentOrigin}/login`;
      setLichessRedirectUri(redirectUri);
      console.log("Lichess Login: Lichess Redirect URI set to:", redirectUri);
    }
  }, []);

  useEffect(() => {
    const authCode = searchParams.get('code');
    const state = searchParams.get('state'); // Lichess might send a state param, capture if needed for CSRF

    console.log("Lichess Login: Login page useEffect triggered. Auth Code:", authCode, "State:", state, "Lichess Redirect URI ready:", !!lichessRedirectUri);

    if (authCode && typeof window !== 'undefined' && lichessRedirectUri) {
      console.log("Lichess Login: Attempting to process Lichess auth code...");
      const codeVerifier = sessionStorage.getItem('lichessCodeVerifier');

      if (!codeVerifier) {
        console.error("Lichess Login Error: Code verifier not found in sessionStorage. This can happen if you refreshed the /login page after Lichess redirected, or if sessionStorage is disabled/cleared.");
        toast({ title: "Lichess Login Error", description: "Code verifier missing. Please try logging in again.", variant: "destructive" });
        if (!debugLichessCallback) {
          router.replace('/login', undefined); // Clean up URL only if not debugging
        }
        return;
      }
      console.log("Lichess Login: Found Lichess code verifier:", codeVerifier);

      const exchangeCodeForToken = async (code: string, verifier: string) => {
        console.log("Lichess Login: Exchanging Lichess code for token with code:", code, "verifier:", verifier, "redirect_uri:", lichessRedirectUri, "client_id:", LICHESS_CLIENT_ID);
        try {
          if (!LICHESS_CLIENT_ID) {
            console.error("Lichess Configuration Error: Client ID (NEXT_PUBLIC_LICHESS_CLIENT_ID) is not configured in .env file.");
            toast({ title: "Lichess Configuration Error", description: "Lichess Client ID is missing. Please set NEXT_PUBLIC_LICHESS_CLIENT_ID in your .env file.", variant: "destructive" });
            return;
          }
          const params = new URLSearchParams();
          params.append('grant_type', 'authorization_code');
          params.append('code', code);
          params.append('redirect_uri', lichessRedirectUri); // Must match what was sent in the auth request and registered
          params.append('client_id', LICHESS_CLIENT_ID);
          params.append('code_verifier', verifier);

          const response = await fetch('https://lichess.org/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });

          const tokenData = await response.json();

          if (!debugLichessCallback) {
            sessionStorage.removeItem('lichessCodeVerifier'); // Clean up verifier
            router.replace('/login', undefined); // Clean up URL query params
          }

          if (response.ok && tokenData.access_token) {
            console.log("Lichess Login: Lichess Access Token (PKCE Flow) received:", tokenData.access_token);
            toast({
              title: "Lichess Token Received (Client-Side)",
              description: "Lichess token obtained. NEXT STEP: This token must be sent to a Firebase Cloud Function to exchange it for a Firebase Custom Token. Only after signing in with that custom token will you be redirected to the dashboard. This part requires backend development.",
              duration: 20000, // Keep toast longer
            });
            // TODO: Send tokenData.access_token to your Firebase Cloud Function.
            // On success from Cloud Function (getting firebaseCustomToken):
            // try {
            //   await signInWithCustomToken(auth, firebaseCustomToken);
            //   toast({ title: "Signed In with Lichess via Firebase", description: "Successfully signed into Firebase."});
            //   router.push('/');
            // } catch (firebaseError) {
            //   console.error("Firebase Custom Token Sign-In Error:", firebaseError);
            //   toast({ title: "Firebase Sign-In Error", description: "Could not sign in with Lichess custom token.", variant: "destructive" });
            // }
          } else {
            console.error("Lichess Login: Lichess Token Exchange Error. Status:", response.status, "Response Data:", tokenData);
            toast({ title: "Lichess Token Error", description: `Failed to get Lichess token. ${tokenData.error_description || tokenData.error || 'Unknown error. Check console for details.'}`, variant: "destructive" });
          }
        } catch (error) {
          console.error("Lichess Login: Lichess token exchange critical error:", error);
          toast({ title: "Lichess Login Network/Fetch Error", description: "Could not exchange code for token. " + (error instanceof Error ? error.message : String(error)), variant: "destructive" });
          if (!debugLichessCallback) {
             sessionStorage.removeItem('lichessCodeVerifier'); // Clean up verifier on error too
             router.replace('/login', undefined); // Clean up URL
          }
        }
      };

      exchangeCodeForToken(authCode, codeVerifier);
    } else if (authCode && !lichessRedirectUri) {
        console.warn("Lichess Login: Lichess auth code present, but redirect URI not yet initialized in state. This can happen on fast re-renders. If login fails, try again.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, toast, lichessRedirectUri, debugLichessCallback]); // `toast` and `router` are stable, `searchParams` and `lichessRedirectUri` are key dependencies. `debugLichessCallback` is for the debug logic.


  const handleLogin = async (providerName: string) => {
    if (providerName === 'Google') {
      const provider = new GoogleAuthProvider();
      try {
        const result: UserCredential = await signInWithPopup(auth, provider);
        toast({ title: "Signed In with Google", description: `Welcome, ${result.user.displayName || result.user.email}!`});
        router.push('/');
      } catch (error: any) {
        console.error("Google Sign-In Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          toast({ title: "Google Sign-In Error", description: "This domain is not authorized. Please check your Firebase project's 'Authorized domains' settings in the Firebase Console.", variant: "destructive", duration: 10000});
        } else if (error.code === 'auth/popup-closed-by-user') {
          toast({ title: "Google Sign-In Error", description: "Popup closed by user or blocked. Check pop-up blockers, third-party cookie settings, browser extensions, or if the domain is authorized in Firebase Console. Ensure 'localhost' (and any preview domain) is in Firebase Auth 'Authorized Domains'.", variant: "destructive", duration: 15000 });
        } else {
          toast({ title: "Google Sign-In Error", description: error.message || "Could not sign in with Google.", variant: "destructive", duration: 10000});
        }
      }
    } else if (providerName === 'Lichess') {
      if (!LICHESS_CLIENT_ID) {
         toast({ title: "Lichess Client ID Missing", description: "Please configure NEXT_PUBLIC_LICHESS_CLIENT_ID in your .env file.", variant: "destructive" });
         console.error("Lichess Login Error: NEXT_PUBLIC_LICHESS_CLIENT_ID is not set in .env file.");
         return;
      }
      if (!lichessRedirectUri) {
        toast({ title: "Lichess Login Setup Error", description: "Redirect URI not ready. Please try again in a moment.", variant: "destructive" });
        console.error("Lichess Login: Lichess login attempted but lichessRedirectUri is not set in state:", lichessRedirectUri);
        return;
      }
      console.log("Lichess Login: Initiating Lichess login with Client ID:", LICHESS_CLIENT_ID, "and Redirect URI:", lichessRedirectUri);
      try {
        const codeVerifier = generateRandomString(128);
        sessionStorage.setItem('lichessCodeVerifier', codeVerifier);
        console.log("Lichess Login: Generated Lichess code verifier and stored in sessionStorage:", codeVerifier);

        const hashed = await sha256(codeVerifier);
        const codeChallenge = base64urlencode(hashed);
        console.log("Lichess Login: Generated Lichess code challenge:", codeChallenge);

        const authUrl = new URL('https://lichess.org/oauth');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', LICHESS_CLIENT_ID); // Client ID is required for Lichess OAuth
        authUrl.searchParams.set('redirect_uri', lichessRedirectUri);
        authUrl.searchParams.set('scope', LICHESS_SCOPES);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('code_challenge', codeChallenge);
        // Optionally, you can add a 'state' parameter for CSRF protection if desired.
        // const state = generateRandomString(32);
        // sessionStorage.setItem('lichessOAuthState', state);
        // authUrl.searchParams.set('state', state);

        console.log("Lichess Login: Redirecting to Lichess auth URL:", authUrl.toString());
        window.location.href = authUrl.toString();
      } catch (error) {
        console.error("Lichess Login: Lichess PKCE setup error:", error);
        toast({ title: "Lichess Login Setup Error", description: "Could not initiate Lichess login. " + (error instanceof Error ? error.message : String(error)), variant: "destructive" });
      }
    }
  };

  const handleGuestAccess = async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      toast({ title: "Guest Access", description: "You're browsing as a guest. Your data might be temporary." });
      if (userCredential.user) {
        router.push('/');
      } else {
        toast({ title: "Guest Access Issue", description: "Could not complete guest sign-in fully, user object not found.", variant: "destructive"});
      }
    } catch (error: any) {
      console.error("Anonymous Sign-In Error:", error);
       if (error.code === 'auth/admin-restricted-operation') {
        toast({ title: "Guest Access Error", description: "Anonymous sign-in is not enabled in your Firebase project. Please enable it in the Firebase Console (Authentication > Sign-in method).", variant: "destructive", duration: 10000 });
      } else {
        toast({ title: "Guest Access Error", description: error.message || "Could not sign in as guest.", variant: "destructive"});
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-8 text-primary">
        <Bot size={48} />
        <h1 className="text-4xl font-headline font-semibold text-foreground">
          ChessForgeAI
        </h1>
      </div>
      <Card className="w-full max-w-md bg-card rounded-xl shadow-soft-ui">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Access Your Account</CardTitle>
          <CardDescription>
            Sign in to continue to your dashboard or explore as a guest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Button
              onClick={() => handleLogin('Google')}
              className="w-full"
              variant="outline"
            >
              <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Sign in with Google
            </Button>
            <Button
              onClick={() => handleLogin('Lichess')}
              className="w-full"
              variant="outline"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 2c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5S18 8.985 18 6.5 15.985 2 13.5 2zm0 7c-1.381 0-2.5-1.119-2.5-2.5S12.119 4 13.5 4s2.5 1.119 2.5 2.5S14.881 9 13.5 9zM4 11.5C4 10.119 5.119 9 6.5 9h1c.868 0 1.636.281 2.273.757L12 12l-2.227 2.243A3.485 3.485 0 016.5 15H4v-3.5zm16 0V15h-2.5c-.868 0-1.636-.281-2.273-.757L13 12l2.227-2.243A3.485 3.485 0 0118.5 9H20v2.5zM9 13.5c0 2.485-2.015 4.5-4.5 4.5S0 15.985 0 13.5 2.015 9 4.5 9s4.5 2.015 4.5 4.5zm-2.5 0c0-1.105-.895-2-2-2s-2 .895-2 2 .895 2 2 2 2-.895 2-2zm11 0c0 2.485-2.015 4.5-4.5 4.5S11 15.985 11 13.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5zm-2.5 0c0-1.105-.895-2-2-2s-2 .895-2 2 .895 2 2 2 2-.895 2-2z"></path></svg>
              Sign in with Lichess.org
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled
            >
               <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path></svg>
              Sign in with Chess.com (Coming Soon)
            </Button>
             <Button
              className="w-full"
              variant="outline"
              disabled
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2zm0 4h2v6h-2z"></path></svg>
              Sign in with Chess24 (Coming Soon)
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button
            onClick={handleGuestAccess}
            className="w-full"
            variant="secondary"
          >
            <User className="mr-2 h-5 w-5" />
            Continue as Guest
          </Button>

        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to ChessForgeAI? Guest access gives limited features. <br /> Sign in to unlock full potential and save your progress.
      </p>
    </div>
  );
}
