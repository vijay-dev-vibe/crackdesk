// components/RewardBanner.tsx
import { useRef, useEffect, useState, useCallback } from "react";
import { PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRewardCode } from "@/hooks/useRewardCode";
import { useToast } from "@/hooks/use-toast";

const CARD_WIDTH = 340;
const CARD_HEIGHT = 140;
const SCRATCH_THRESHOLD = 0.5; // 50% scratched = fully reveal

export default function RewardBanner() {
  console.log("RewardBanner rendered"); 
  const { reward, loading, redeeming, error, redeem } = useRewardCode();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [justRedeemed, setJustRedeemed] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scratch-off silver/gold layer
    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    gradient.addColorStop(0, "#d4af37");
    gradient.addColorStop(0.5, "#f5d576");
    gradient.addColorStop(1, "#d4af37");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.fillText("✦ Scratch to reveal your code ✦", CARD_WIDTH / 2, CARD_HEIGHT / 2);

    ctx.globalCompositeOperation = "destination-out";
  }, []);

  useEffect(() => {
    if (reward && !reward.redeemed) setupCanvas();
  }, [reward, setupCanvas]);

  const checkRevealPercent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixels = ctx.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT).data;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }
    const percent = transparent / (pixels.length / 4);
    if (percent > SCRATCH_THRESHOLD) setRevealed(true);
  }, []);

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * CARD_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CARD_HEIGHT,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };
  const handleEnd = () => {
    isDrawing.current = false;
    checkRevealPercent();
  };

  if (loading || !reward || reward.redeemed || justRedeemed) return null;

  const handleRedeem = async () => {
    const ok = await redeem();
    if (ok) {
      setJustRedeemed(true);
      toast({
        title: "🎉 Pro Unlocked!",
        description: "You now have Pro access for 30 days. Great score!",
      });
    } else if (error) {
      toast({ title: "Couldn't redeem code", description: error, variant: "destructive" });
    }
  };

  return (
    <div className="mb-6 flex flex-col items-center gap-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
      <div className="flex items-center gap-2 text-center">
        <Sparkles className="h-5 w-5 text-amber-600" />
        <p className="font-semibold text-foreground">
          You scored 80%+ — you've earned a reward!
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-lg shadow-md"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
        {/* Prize layer underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary/30">
          <p className="text-xs text-muted-foreground">Your Pro reward code</p>
          <p className="font-mono text-xl font-bold tracking-wider text-primary">{reward.code}</p>
          <p className="text-xs text-muted-foreground">30 days free Pro access</p>
        </div>

        {/* Scratch layer on top */}
        {!revealed && (
          <canvas
            ref={canvasRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            className="absolute inset-0 cursor-pointer touch-none rounded-lg"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        )}
      </div>

      {revealed && (
        <Button onClick={handleRedeem} disabled={redeeming} className="gap-2">
          <PartyPopper className="h-4 w-4" />
          {redeeming ? "Activating..." : "Activate Pro"}
        </Button>
      )}
    </div>
  );
}