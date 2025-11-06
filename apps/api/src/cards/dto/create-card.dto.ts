export class CreateCardDto {
  columnId: string;
  title: string;
  html?: string;
  json?: any;
  plain?: string;
  order: number;
}
