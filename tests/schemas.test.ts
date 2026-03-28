import { describe, expect, it } from "vitest";
import { registrationSchema, timerExtendSchema } from "@/lib/schemas";

describe("registration schema", () => {
  it("accepts a valid registration payload", () => {
    const result = registrationSchema.safeParse({
      teamName: "Blue Falcon",
      players: ["Ada", "Lewis", "Kai"],
      livery: {
        preset: "Velocity",
        primaryColor: "#FF0000",
        secondaryColor: "#001122",
        carNumber: 33
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than 5 players", () => {
    const result = registrationSchema.safeParse({
      teamName: "Team Overflow",
      players: ["A", "B", "C", "D", "E", "F"],
      livery: {
        preset: "Apex",
        primaryColor: "#00AA00",
        secondaryColor: "#001122",
        carNumber: 11
      }
    });

    expect(result.success).toBe(false);
  });

  it("only allows 5 or 10 minute extensions", () => {
    expect(timerExtendSchema.safeParse({ minutes: 5 }).success).toBe(true);
    expect(timerExtendSchema.safeParse({ minutes: 10 }).success).toBe(true);
    expect(timerExtendSchema.safeParse({ minutes: 7 }).success).toBe(false);
  });
});
