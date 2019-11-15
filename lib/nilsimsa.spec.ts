import faker from "faker";
import Nilsimsa, { compareDigest } from "./nilsimsa";

// ensure faker consistent data accross runs
faker.seed(123);

describe("nilsimsa", function() {
  // see samples here https://asecuritysite.com/encryption/nil
  const str1 = "The quick brown fox";
  const str2 = "The quicker brown fox";

  const buf1 = Buffer.from(str1);
  const buf2 = Buffer.from(str2);

  const expectedDigest1 = Buffer.from(
    "0a31b4be01a0808a29e0ec60e9a258545dc0526770022348380a2128708f2fdb",
    "hex"
  );
  const expectedDigest2 = Buffer.from(
    "1a31bc3e02a080a28b642864ea224857ddd0526f78022b48380e2269329d3fdb",
    "hex"
  );

  describe("Nilsimsa#digest", () => {
    it("should return standard digest values", () => {
      expect(Nilsimsa.default(buf1).digest()).toEqual(expectedDigest1);
      expect(Nilsimsa.default(buf2).digest()).toEqual(expectedDigest2);
    });

    it("should return the same digest value for the same input", () => {
      const randomStr = faker.lorem.words(50); // 50 random words
      const randomBuf = Buffer.from(randomStr);

      expect(Nilsimsa.default(randomBuf).digest()).toEqual(
        Nilsimsa.default(randomBuf).digest()
      );
    });

    it("should allow computing a hash over multiple updates", () => {
      const str1Part1 = "The quick ";
      const str1Part2 = "brown fox";
      const nilsimsa = Nilsimsa.default();

      nilsimsa.update(Buffer.from(str1Part1));
      nilsimsa.update(Buffer.from(str1Part2));

      expect(nilsimsa.digest()).toEqual(expectedDigest1);
    });
  });

  describe("compareDigest", () => {
    // see here https://asecuritysite.com/encryption/nil
    const expectedDigestScore = 91;

    const all1 = Buffer.from(
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      "hex"
    );
    const all0 = Buffer.from(
      "0000000000000000000000000000000000000000000000000000000000000000",
      "hex"
    );

    it("return a standard score", () => {
      expect(compareDigest(expectedDigest1, expectedDigest2)).toEqual(
        expectedDigestScore
      );
    });

    it("should return 128 for identical input", () => {
      expect(compareDigest(expectedDigest1, expectedDigest1)).toEqual(128);
      expect(compareDigest(expectedDigest2, expectedDigest2)).toEqual(128);
      expect(compareDigest(all1, all1)).toEqual(128);
      expect(compareDigest(all0, all0)).toEqual(128);
    });

    it("should return -128 for digest with no common bits", () => {
      expect(compareDigest(all1, all0)).toEqual(-128);
    });

    describe("validation", () => {
      it("should throw if 2 digests are not the same byte length", () => {
        const digest1 = Buffer.from("aaaaaaa", "hex");
        const digest2 = Buffer.from("bbb", "hex");

        expect(() => compareDigest(digest1, digest2)).toThrow();
      });

      it("should throw if the digests are not 256 bits in length", () => {
        let strDigest1: string, strDigest2: string;

        // identical, but shorter than 256 bits
        strDigest1 = expectedDigest1.toString().substr(0, 60);
        strDigest2 = expectedDigest1.toString().substr(0, 60);

        expect(() =>
          compareDigest(
            Buffer.from(strDigest1, "hex"),
            Buffer.from(strDigest2, "hex")
          )
        ).toThrow();

        // identical, but longer than 256 bits
        strDigest1 = expectedDigest1.toString() + "ab";
        strDigest2 = expectedDigest1.toString() + "ab";

        expect(() =>
          compareDigest(
            Buffer.from(strDigest1, "hex"),
            Buffer.from(strDigest2, "hex")
          )
        ).toThrow();
      });
    });

    describe("similarity score against a threshold", () => {
      const expectedSimilarityThreshold = 54; // proposed in http://spdp.di.unimi.it/papers/pdcs04.pdf

      it("should return a low score for differing input", () => {
        const input1 = faker.lorem.words(100);
        const input2 = faker.random.words(100);
        const digest1 = Nilsimsa.default(Buffer.from(input1)).digest();
        const digest2 = Nilsimsa.default(Buffer.from(input2)).digest();

        expect(compareDigest(digest1, digest2)).toBeLessThan(
          expectedSimilarityThreshold
        );
      });

      it("should return a high score for similar input", () => {
        const baseInput = faker.lorem.words(100);
        const input1 = "John, " + baseInput;
        const input2 = "Timothy, " + baseInput;
        const digest1 = Nilsimsa.default(Buffer.from(input1)).digest();
        const digest2 = Nilsimsa.default(Buffer.from(input2)).digest();

        expect(compareDigest(digest1, digest2)).toBeGreaterThanOrEqual(
          expectedSimilarityThreshold
        );
      });
    });
  });
});
