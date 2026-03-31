import { describe, expect, it } from "vitest";
import { challengePromptSchema, registrationSchema, timerExtendSchema } from "@/lib/schemas";

describe("registration schema", () => {
  it("accepts a valid registration payload", () => {
    const result = registrationSchema.safeParse({
      teamName: "Blue Falcon",
      playerIds: ["p1", "p2", "p3", "p4", "p5"],
      livery: {
        carTemplate: "01",
        primaryColor: "#FF0000",
        secondaryColor: "#001122",
        tertiaryColor: "#8D99AE",
        carNumber: 33
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects fewer than 5 players", () => {
    const result = registrationSchema.safeParse({
      teamName: "Short Bench",
      playerIds: ["a", "b", "c"],
      livery: {
        carTemplate: "01",
        primaryColor: "#FF0000",
        secondaryColor: "#001122",
        tertiaryColor: "#8D99AE",
        carNumber: 1
      }
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 players", () => {
    const result = registrationSchema.safeParse({
      teamName: "Team Overflow",
      playerIds: ["a", "b", "c", "d", "e", "f"],
      livery: {
        carTemplate: "03",
        primaryColor: "#00AA00",
        secondaryColor: "#001122",
        tertiaryColor: "#112233",
        carNumber: 11
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate player ids", () => {
    const result = registrationSchema.safeParse({
      teamName: "Dupes",
      playerIds: ["same", "same", "b", "c", "d"],
      livery: {
        carTemplate: "07",
        primaryColor: "#FF0000",
        secondaryColor: "#001122",
        tertiaryColor: "#8D99AE",
        carNumber: 1
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

describe("challenge prompt schema", () => {
  it("accepts a valid payload", () => {
    const result = challengePromptSchema.safeParse({
      teamId: "abc123",
      prompt: "A rubber duck needs to Run a live auction for A crew of elite Navy SEALs",
      spinsUsed: 2
    });
    expect(result.success).toBe(true);
  });

  it("rejects spinsUsed out of range", () => {
    expect(
      challengePromptSchema.safeParse({
        teamId: "x",
        prompt: "A golden retriever needs to Assign and track tasks for A panel of Fortune 500 CEOs",
        spinsUsed: 0
      }).success
    ).toBe(false);
    expect(
      challengePromptSchema.safeParse({
        teamId: "x",
        prompt: "A golden retriever needs to Assign and track tasks for A panel of Fortune 500 CEOs",
        spinsUsed: 4
      }).success
    ).toBe(false);
  });
});
