// Unit tests for the guest wishlist: pure storage rules, validation and
// verification math. No browser, no database, no account.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addId,
  isStoredId,
  parseStoredIds,
  prependId,
  readStoredIds,
  removeId,
  splitResolved,
  toggleId,
  WISHLIST_KEY,
  WISHLIST_MAX_IDS,
  writeStoredIds,
  type StorageLike,
} from "../lib/wishlist/storage";
import { wishlistResolveSchema } from "../lib/wishlist/validation";

/** Minimal in-memory Storage-like object. */
class FakeStorage implements StorageLike {
  private map = new Map<string, string>();
  throwOnSet = false;
  throwOnGet = false;
  getItem(key: string): string | null {
    if (this.throwOnGet) throw new Error("storage blocked");
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new Error("quota exceeded");
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  raw(): Map<string, string> {
    return this.map;
  }
}

describe("guest wishlist storage rules", () => {
  test("parses a stored JSON array of ids", () => {
    const storage = new FakeStorage();
    storage.setItem(WISHLIST_KEY, JSON.stringify(["p1", "p2"]));
    assert.deepEqual(readStoredIds(storage, WISHLIST_KEY, WISHLIST_MAX_IDS), [
      "p1",
      "p2",
    ]);
  });

  test("corrupted JSON degrades to empty, never crashes", () => {
    const storage = new FakeStorage();
    storage.setItem(WISHLIST_KEY, "{not-json!!!");
    assert.deepEqual(readStoredIds(storage, WISHLIST_KEY, WISHLIST_MAX_IDS), []);
  });

  test("non-array values degrade to empty", () => {
    const storage = new FakeStorage();
    storage.setItem(WISHLIST_KEY, JSON.stringify({ id: "p1" }));
    assert.deepEqual(readStoredIds(storage, WISHLIST_KEY, WISHLIST_MAX_IDS), []);
  });

  test("invalid entries: numbers, nulls, empty and fully-qualified strings are filtered", () => {
    const storage = new FakeStorage();
    storage.setItem(
      WISHLIST_KEY,
      JSON.stringify(["p1", 42, null, "", "prod_ct", { id: "x" }])
    );
    assert.deepEqual(parseStoredIds(storage.getItem(WISHLIST_KEY), WISHLIST_MAX_IDS), [
      "p1",
      "prod_ct",
    ]);
  });

  test("duplicates are stored only once, in first-seen order", () => {
    assert.deepEqual(
      parseStoredIds(JSON.stringify(["a", "b", "a", "c", "b"]), 100),
      ["a", "b", "c"]
    );
  });

  test("isStoredId rejects suspicious values", () => {
    assert.equal(isStoredId("p-1"), true);
    assert.equal(isStoredId(""), false);
    assert.equal(isStoredId("x".repeat(101)), false);
    assert.equal(isStoredId("p/1"), false);
    assert.equal(isStoredId("p 1"), false);
    assert.equal(isStoredId(7), false);
  });

  test("parse caps the list so a hostile value can't blow memory", () => {
    const many = Array.from({ length: 500 }, (_, i) => `p${i}`);
    assert.equal(parseStoredIds(JSON.stringify(many), WISHLIST_MAX_IDS).length, WISHLIST_MAX_IDS);
  });

  test("write + read round-trips (persistence)", () => {
    const storage = new FakeStorage();
    const ok = writeStoredIds(storage, WISHLIST_KEY, ["p1", "p2", "p3"]);
    assert.equal(ok, true);
    assert.deepEqual(readStoredIds(storage, WISHLIST_KEY, WISHLIST_MAX_IDS), [
      "p1",
      "p2",
      "p3",
    ]);
  });

  test("write failure (private mode / quota) reports false and doesn't throw", () => {
    const storage = new FakeStorage();
    storage.throwOnSet = true;
    assert.equal(writeStoredIds(storage, WISHLIST_KEY, ["p1"]), false);
  });

  test("read failure (blocked storage) degrades to empty", () => {
    const storage = new FakeStorage();
    storage.throwOnGet = true;
    assert.deepEqual(readStoredIds(storage, WISHLIST_KEY, WISHLIST_MAX_IDS), []);
  });

  test("null storage (no browser) degrades to empty", () => {
    assert.deepEqual(readStoredIds(null, WISHLIST_KEY, WISHLIST_MAX_IDS), []);
    assert.equal(writeStoredIds(null, WISHLIST_KEY, ["p1"]), false);
  });
});

describe("guest wishlist algebra", () => {
  test("add dedupes and preserves order", () => {
    assert.deepEqual(addId([], "p1", 100), ["p1"]);
    assert.deepEqual(addId(["p1", "p2"], "p1", 100), ["p1", "p2"]);
  });

  test("add respects cap, keeping the newest ids", () => {
    assert.deepEqual(addId(["p1"], "p2", 2), ["p1", "p2"]);
    assert.deepEqual(addId(["p1", "p2"], "p3", 2), ["p2", "p3"]);
  });

  test("add ignores invalid ids", () => {
    assert.deepEqual(addId(["p1"], "", 100), ["p1"]);
    assert.deepEqual(addId(["p1"], "bad id", 100), ["p1"]);
  });

  test("remove removes only the matching id", () => {
    assert.deepEqual(removeId(["p1", "p2", "p3"], "p2"), ["p1", "p3"]);
    assert.deepEqual(removeId(["p1"], "missing"), ["p1"]);
  });

  test("toggle adds then removes", () => {
    assert.deepEqual(toggleId([], "p1", 100), ["p1"]);
    assert.deepEqual(toggleId(["p1"], "p1", 100), []);
  });

  test("prepend tracks recently-viewed newest-first with dedup and cap", () => {
    let ids: string[] = [];
    ids = prependId(ids, "a", 3);
    ids = prependId(ids, "b", 3);
    assert.deepEqual(ids, ["b", "a"]);
    ids = prependId(ids, "a", 3); // re-view moves to front
    assert.deepEqual(ids, ["a", "b"]);
    ids = prependId(ids, "c", 3); // b falls out of the capped window
    ids = prependId(ids, "d", 3);
    assert.equal(ids.length, 3);
    assert.deepEqual(ids, ["d", "c", "a"]);
  });
});

describe("product verification (catalogue resolution math)", () => {
  test("splitResolved separates found from missing, preserving order", () => {
    const { found, missing } = splitResolved(
      ["p1", "gone", "p2", "gone2"],
      new Set(["p1", "p2"])
    );
    assert.deepEqual(found, ["p1", "p2"]);
    assert.deepEqual(missing, ["gone", "gone2"]);
  });

  test("splitResolved nothing requested → nothing missing", () => {
    assert.deepEqual(splitResolved([], new Set(["p1"])), { found: [], missing: [] });
  });
});

describe("guest wishlist request validation", () => {
  test("missing fields default to empty lists", () => {
    const parsed = wishlistResolveSchema.parse({});
    assert.deepEqual(parsed.productIds, []);
    assert.deepEqual(parsed.recentlyViewedIds, []);
  });

  test("valid id lists parse and trim", () => {
    const parsed = wishlistResolveSchema.parse({
      productIds: [" p1 ", "p2"],
      recentlyViewedIds: [" r1"],
    });
    assert.deepEqual(parsed.productIds, ["p1", "p2"]);
    assert.deepEqual(parsed.recentlyViewedIds, ["r1"]);
  });

  test("too many ids is rejected (abuse guard)", () => {
    const ids = Array.from({ length: WISHLIST_MAX_IDS + 1 }, (_, i) => `p${i}`);
    assert.equal(wishlistResolveSchema.safeParse({ productIds: ids }).success, false);
  });

  test("non-string entries are rejected", () => {
    assert.equal(
      wishlistResolveSchema.safeParse({ productIds: ["p1", 42] }).success,
      false
    );
  });

  test("empty/whitespace ids are rejected", () => {
    assert.equal(wishlistResolveSchema.safeParse({ productIds: [""] }).success, false);
    assert.equal(wishlistResolveSchema.safeParse({ productIds: ["   "] }).success, false);
  });
});

describe("guest privacy constraints (storage holds ids only)", () => {
  test("serialised wishlist contains only product ids", () => {
    const storage = new FakeStorage();
    writeStoredIds(storage, WISHLIST_KEY, ["p1", "p2"]);
    const raw = storage.getItem(WISHLIST_KEY);
    assert.equal(raw, '["p1","p2"]');
    assert.doesNotMatch(raw!, /image|photo|measure|conversation/i);
  });

  test("personally-identifiable values never survive parsing", () => {
    const storage = new FakeStorage();
    storage.setItem(
      WISHLIST_KEY,
      JSON.stringify([
        "p1",
        "md5:face-embedding",
        "photo:https://cdn.test/selfie.jpg",
        'message:"my taste"',
      ])
    );
    assert.deepEqual(readStoredIds(storage, WISHLIST_KEY, WISHLIST_MAX_IDS), ["p1"]);
  });
});