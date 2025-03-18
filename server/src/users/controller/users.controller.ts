import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { RolesGuard } from '@/guards/roles.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { AdminProfileDto } from '../dtos/admin.profile.dto';
import { UserDto } from '../dtos/user.dto';
import { UsersService } from '../services/users.service';
import { PaginatedUsersDto } from '../dtos/paginated-users.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Serialize(PaginatedUsersDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.findAll(pageNumber, limitNumber);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteOne(id);
  }

  @Serialize(UserDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Serialize(UserDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() credentials: AdminProfileDto,
  ) {
    return this.usersService.adminUpdate(id, credentials);
  }

  @Serialize(UserDto)
  @Post('seed')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  async generateUsers() {
    return this.usersService.generateUsers(500);
  }

  @ApiTags('Users')
  @ApiOperation({ summary: 'Find user by email' })
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    return this.usersService.findOne(email);
  }

  @Serialize(UserDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post()
  async createUser(@Body() createUserDto: AdminProfileDto) {
    return this.usersService.create(createUserDto);
  }
}
