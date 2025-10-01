import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center animate-fade-in">
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center shadow-elevated">
            <Home className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Booky
          </h1>
          <p className="text-xl text-muted-foreground">
            Find your perfect stay, one scroll at a time
          </p>
        </div>

        <div className="space-y-4 pt-8">
          <Button
            onClick={() => navigate("/register")}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
          >
            Get Started
          </Button>
          <Button
            onClick={() => navigate("/login")}
            variant="outline"
            className="w-full h-14 text-lg font-semibold"
          >
            Login
          </Button>
        </div>

        <p className="text-sm text-muted-foreground pt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Welcome;
