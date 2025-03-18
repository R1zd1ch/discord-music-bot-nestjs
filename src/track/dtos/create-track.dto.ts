import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
export class CreateTrackDto {
  @IsString()
  @IsNotEmpty()
  trackId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  artist: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsString()
  @IsOptional()
  url: string;

  @IsString()
  @IsNotEmpty()
  coverUrl: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}
