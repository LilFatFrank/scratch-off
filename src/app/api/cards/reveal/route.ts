import { NextRequest, NextResponse } from "next/server";

// Prize calculation function (same as process-prize)
function drawPrize(): number {
  const r = Math.random() * 100;    // 0.000 … 99.999
  console.log("Prize calculation random:", r);

  if (r < 35)  return 0;      // 35 % lose
  if (r < 75)  return 0.50;   // +40 %  → 75 %
  if (r < 87)  return 1;      // +12 %  → 87 %
  if (r < 98)  return 2;      // +11 %  → 98 %
  return 0;                   // last 2 % blank
}

export async function POST(request: NextRequest) {
  try {
    const { cardId } = await request.json();
    
    if (!cardId) {
      return NextResponse.json(
        { error: "Missing required field: cardId" },
        { status: 400 }
      );
    }

    // Calculate prize amount
    const prizeAmount = drawPrize();
    
    let message = "";
    if (prizeAmount === 0) {
      message = "Better luck next time!";
    } else {
      message = `Congratulations! You won $${prizeAmount}!`;
    }

    console.log(`Card ${cardId} reveal - Prize: $${prizeAmount}`);
    
    return NextResponse.json({
      success: true,
      prizeAmount: prizeAmount,
      message: message
    });
    
  } catch (error) {
    console.error('Error in reveal card:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 