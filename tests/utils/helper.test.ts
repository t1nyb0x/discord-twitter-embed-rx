import { uniqueArr } from "@/utils/helper";

test("重複を削除チェック", () => {
  expect(uniqueArr([1, 2, 2, 3, 4, 4])).toEqual([1, 2, 3, 4]);
  expect(uniqueArr(["a", "b", "b", "c"])).toEqual(["a", "b", "c"]);
});
