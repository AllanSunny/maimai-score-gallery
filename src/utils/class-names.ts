interface ConditionalClassName {
  when: boolean;
  then: string;
  else?: string;
}

type ClassName = string | false | null | undefined | ConditionalClassName;

export function classNames(...classNames: ClassName[]) {
  return classNames
    .map((className) => {
      if (typeof className === "object" && className) {
        return className.when ? className.then : className.else;
      }

      return className;
    })
    .filter(Boolean)
    .join(" ");
}
