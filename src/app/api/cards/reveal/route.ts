import { NextRequest, NextResponse } from "next/server";
import { drawPrize } from "~/lib/drawPrize";

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