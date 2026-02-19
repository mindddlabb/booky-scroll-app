import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import onboarding1 from "@/assets/onboarding-1.jpg";
import onboarding2 from "@/assets/onboarding-2.jpg";
import onboarding3 from "@/assets/onboarding-3.jpg";

const slides = [
  {
    image: onboarding1,
    title: "Find Your Perfect Stay",
    description:
      "Browse stunning apartments and short-term rentals, all in one place — curated just for you.",
  },
  {
    image: onboarding2,
    title: "Book With Confidence",
    description:
      "Verified listings, real reviews, and seamless booking so you can move in stress-free.",
  },
  {
    image: onboarding3,
    title: "Explore Any City",
    description:
      "From local gems to global destinations — discover apartments wherever life takes you.",
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      navigate("/register");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(225,60%,12%)] via-[hsl(225,55%,22%)] to-[hsl(215,70%,55%)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(215,70%,50%/0.2)] blur-[120px] pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-sm z-10">
        <div className="bg-card rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500">
          {/* Image area */}
          <div className="relative h-[340px] overflow-hidden">
            {slides.map((slide, i) => (
              <img
                key={i}
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                style={{ opacity: i === current ? 1 : 0 }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          </div>

          {/* Text content */}
          <div className="px-8 pb-8 pt-2 text-center space-y-3">
            <h2 className="text-2xl font-bold text-card-foreground leading-tight">
              {slides[current].title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {slides[current].description}
            </p>

            {/* Dots */}
            <div className="flex justify-center gap-2 pt-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Next button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={next}
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Skip / Login */}
      <div className="z-10 mt-8 flex flex-col items-center gap-3">
        <Button
          variant="ghost"
          className="text-white/80 hover:text-white hover:bg-white/10"
          onClick={() => navigate("/register")}
        >
          Skip &amp; Get Started
        </Button>
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          Already have an account? <span className="underline">Login</span>
        </button>
      </div>
    </div>
  );
};

export default Welcome;
