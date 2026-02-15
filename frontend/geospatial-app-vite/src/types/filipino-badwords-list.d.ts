declare module "filipino-badwords-list" {
  const filipinoBadwords: {
    array: string[];
    object: Record<string, string>;
    regex: RegExp;
  };

  export default filipinoBadwords;
}
