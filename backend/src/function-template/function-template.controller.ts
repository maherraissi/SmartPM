import { Controller } from '@nestjs/common';
import { FunctionTemplateService } from './function-template.service';

@Controller('function-template')
export class FunctionTemplateController {
  constructor(private readonly functionTemplateService: FunctionTemplateService) {}
}
