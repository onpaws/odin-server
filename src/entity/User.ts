import {Entity, PrimaryGeneratedColumn, Column, BaseEntity} from "typeorm";

@Entity("users")
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: number;
  
    @Column("text")
    email: string;
  
    @Column("text")
    password: string;
}
