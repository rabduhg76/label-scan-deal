import React, { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useAuth } from "@/lib/auth";
import { LogIn, LogOut, User as UserIcon, Sparkles, Sliders, Crown } from "lucide-react";
import { AccountSettingsModal } from "@/components/AccountSettingsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function UserMenu() {
  const { user, loginWithCredential, loginMock, logout, isLoading, isSubscribed } = useAuth();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  if (user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 p-1 pr-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-brand/50"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand/20 grid place-items-center text-brand font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-white/90 text-xs hidden sm:inline max-w-[120px] truncate">
                {user.name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-deep/95 border-white/15 text-white backdrop-blur-xl z-50 p-2 shadow-2xl"
          >
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold leading-none text-white">{user.name}</p>
                  {isSubscribed && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand text-brand-foreground font-bold">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-none text-white/50 truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuItem
              onClick={() => setSettingsOpen(true)}
              className="hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white cursor-pointer rounded-lg px-2 py-1.5 text-xs flex items-center gap-2 text-white/90"
            >
              <Sliders className="w-3.5 h-3.5 text-brand" />
              <span>Allergen & Plan Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuItem
              onClick={logout}
              className="text-danger hover:bg-danger/10 hover:text-danger focus:bg-danger/10 focus:text-danger cursor-pointer rounded-lg px-2 py-1.5 text-xs flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AccountSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }

  const loginContent = (
    <div className="flex flex-col items-center gap-4 py-4">
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <div className="w-full flex justify-center py-2">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  loginWithCredential(credentialResponse.credential);
                  setOpen(false);
                }
              }}
              onError={() => {
                console.error("Google Login Failed");
              }}
              theme="filled_black"
              shape="pill"
              text="signin_with"
            />
          </div>
        </GoogleOAuthProvider>
      ) : (
        <div className="w-full text-center space-y-3">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70">
            <p className="font-semibold text-brand mb-1">Google Client ID Setup</p>
            Add <code className="text-ice bg-black/40 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> to your <code className="text-ice bg-black/40 px-1 py-0.5 rounded">.env</code> to connect real Google accounts.
          </div>
          <button
            onClick={() => {
              loginMock();
              setOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 clip-scan bg-brand text-brand-foreground font-display font-bold text-xs py-2.5 px-4 transition-transform active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Try Demo Login
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white tracking-wide transition-all shadow-sm active:scale-95">
          <LogIn className="w-3.5 h-3.5 text-brand" />
          <span>Sign In</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-deep/95 border-white/15 text-white backdrop-blur-2xl max-w-sm sm:rounded-2xl z-50">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl text-center text-white">
            Sign in to Gluten Free Deal
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-white/60">
            Save scan results, history, and customize your ingredient alerts.
          </DialogDescription>
        </DialogHeader>
        {loginContent}
      </DialogContent>
    </Dialog>
  );
}
